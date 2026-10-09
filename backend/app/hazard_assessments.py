from __future__ import annotations

import re
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import HazardAssessment, User
from .schemas import HazardAssessmentPayload, HazardAssessmentResponse


router = APIRouter(prefix="/api/hazard-assessments", tags=["hazard-assessments"])
READ_ROLES = {"safety_manager", "project_manager", "ordinary", "operator", "admin"}
WRITE_ROLES = {"safety_manager", "admin"}
STAGES = ["待整改", "整改中", "待复核", "复核中", "待项目经理确认", "已闭环"]


class RectificationStatusPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["待整改", "整改中", "待复核", "复核中", "待项目经理确认", "已闭环"]
    operation: Literal["save_progress", "advance", "withdraw", "reject", "edit"]
    expected_version: int = Field(ge=0)
    note: str = Field(min_length=1, max_length=4000)
    rectification_photo_name: str = Field(default="", max_length=180)
    rectification_photo_data: str = Field(default="", max_length=1_500_000)
    review_result: Literal["", "合格", "不合格"] = ""
    review_measured_value: str = Field(default="", max_length=100)
    review_standard_value: str = Field(default="", max_length=160)
    edit_event_id: str = Field(default="", max_length=80)


def require_reader(user: User = Depends(get_current_user)) -> User:
    if user.role not in READ_ROLES:
        raise HTTPException(status_code=403, detail="当前角色无风险数据查看权限")
    return user


def require_assessor(user: User = Depends(get_current_user)) -> User:
    if user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="当前角色无风险评估权限")
    return user


def require_rectifier(user: User = Depends(get_current_user)) -> User:
    if user.role not in {"project_manager", "safety_manager", "admin"}:
        raise HTTPException(status_code=403, detail="当前角色无整改操作权限")
    return user


def workflow_status(item: HazardAssessment) -> str:
    if item.status in {"已完成", "评估中"}:
        return "待整改"
    return "已闭环" if item.status == "已整改" else item.status


def validate_review_data(item: HazardAssessment, payload: RectificationStatusPayload) -> None:
    standard = payload.review_standard_value.strip()
    if item.standard_value.strip() and standard != item.standard_value.strip():
        raise HTTPException(status_code=422, detail="复核必须使用原评估控制标准")
    # Only explicit numeric limits are machine-comparable; descriptive standards
    # still require the original assessor's recorded conclusion.
    limit = re.fullmatch(r"\s*(<=|>=|<|>|≤|≥|=)\s*([+-]?\d+(?:\.\d+)?)\s*(.*)", standard)
    if not limit:
        return
    measured = re.fullmatch(r"\s*([+-]?\d+(?:\.\d+)?)\s*(.*)", payload.review_measured_value)
    if not measured:
        raise HTTPException(status_code=422, detail="该控制标准为数值阈值，请填写数值检测结果")
    operator, threshold, limit_unit = limit.groups()
    value, measured_unit = measured.groups()
    expected_unit = limit_unit.strip() or item.unit.strip()
    if measured_unit.strip() and measured_unit.strip() != expected_unit:
        raise HTTPException(status_code=422, detail="复核检测值的单位与控制标准不一致")
    actual, bound = Decimal(value), Decimal(threshold)
    passed = {"<=": actual <= bound, "≤": actual <= bound, ">=": actual >= bound, "≥": actual >= bound, "<": actual < bound, ">": actual > bound, "=": actual == bound}[operator]
    if not passed:
        raise HTTPException(status_code=422, detail="复核检测数据未达到控制标准，请退回整改")


def discovery_event(item: HazardAssessment, reviewer: User | None) -> dict:
    return {
        "id": f"assessment-{item.id}", "operation": "assessment", "actor_id": item.user_id,
        "actor": reviewer.display_name if reviewer else item.inspector,
        "role": reviewer.role if reviewer else "safety_manager", "created_at": item.created_label,
        "from_status": "评估发现隐患", "to_status": "待整改",
        "note": item.finding, "measured_value": item.measured_value,
        "standard_value": item.standard_value, "photo_name": item.photo_name,
        "photo_data": item.photo_data, "review_result": "",
    }


def to_response(item: HazardAssessment, db: Session) -> HazardAssessmentResponse:
    reviewer = db.get(User, item.user_id)
    fields = {name: getattr(item, name) for name in HazardAssessmentPayload.model_fields if name != "created_at"}
    logs = item.rectification_log or []
    if item.has_hazard and not logs:
        logs = [discovery_event(item, reviewer)]
    return HazardAssessmentResponse(
        **fields, created_at=item.created_label, user_id=item.user_id,
        reviewer_name=reviewer.display_name if reviewer else item.inspector,
        rectification_photo_name=item.rectification_photo_name or "",
        rectification_photo_data=item.rectification_photo_data or "",
        review_result=item.review_result or "", review_measured_value=item.review_measured_value or "",
        review_standard_value=item.review_standard_value or "",
        rectification_log=logs, workflow_version=item.workflow_version,
    )


@router.get("", response_model=list[HazardAssessmentResponse])
def list_hazard_assessments(user: User = Depends(require_reader), db: Session = Depends(get_db)):
    query = select(HazardAssessment).order_by(HazardAssessment.updated_at.desc())
    return [to_response(item, db) for item in db.scalars(query).all()]


@router.put("/{assessment_id}", response_model=HazardAssessmentResponse)
def save_hazard_assessment(
    assessment_id: str, payload: HazardAssessmentPayload,
    user: User = Depends(require_assessor), db: Session = Depends(get_db),
):
    if assessment_id != payload.id:
        raise HTTPException(status_code=400, detail="评估记录编号不一致")
    item = db.scalar(select(HazardAssessment).where(HazardAssessment.id == assessment_id).with_for_update())
    is_new = item is None
    if is_new:
        if payload.status not in {"已完成", "评估中", "待整改"}:
            raise HTTPException(status_code=422, detail="新评估不能直接进入复核或闭环阶段")
        item = HazardAssessment(id=assessment_id, user_id=user.id)
        db.add(item)
    elif item.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=404, detail="评估记录不存在")
    elif item.workflow_version:
        raise HTTPException(status_code=409, detail="已进入整改流程的评估不能覆盖，请新建评估")
    elif payload.status != item.status and {payload.status, item.status} != {"已完成", "待整改"}:
        raise HTTPException(status_code=409, detail="整改状态必须通过整改流程更新")
    for field in HazardAssessmentPayload.model_fields:
        if field not in {"id", "status", "created_at"}:
            setattr(item, field, getattr(payload, field))
    if is_new:
        item.status = "待整改" if payload.has_hazard else payload.status
        item.created_label = payload.created_at
    if item.has_hazard:
        item.rectification_log = [discovery_event(item, db.get(User, item.user_id))]
    db.commit()
    db.refresh(item)
    return to_response(item, db)


@router.delete("/{assessment_id}", response_model=dict[str, bool])
def delete_hazard_assessment(
    assessment_id: str, user: User = Depends(require_assessor), db: Session = Depends(get_db),
):
    item = db.get(HazardAssessment, assessment_id)
    if item is None or (item.user_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=404, detail="评估记录不存在")
    db.delete(item)
    db.commit()
    return {"deleted": True}


@router.patch("/{assessment_id}/rectification", response_model=HazardAssessmentResponse)
def update_rectification(
    assessment_id: str, payload: RectificationStatusPayload,
    user: User = Depends(require_rectifier), db: Session = Depends(get_db),
):
    item = db.get(HazardAssessment, assessment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="评估记录不存在")
    if not item.has_hazard:
        raise HTTPException(status_code=400, detail="该评估未识别隐患，无需整改")
    if item.workflow_version != payload.expected_version:
        raise HTTPException(status_code=409, detail="处理记录已被更新，请刷新后重试")
    current = workflow_status(item)
    if current not in STAGES:
        raise HTTPException(status_code=409, detail="未知整改状态，请联系管理员核对")
    if not payload.note.strip():
        raise HTTPException(status_code=422, detail="请填写处理进展或撤回原因")
    if payload.rectification_photo_data and not re.fullmatch(r"data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+", payload.rectification_photo_data):
        raise HTTPException(status_code=422, detail="整改证据仅支持 JPG、PNG、WebP 图片")

    reviewer = user.role in WRITE_ROLES
    review_stage = current in {"待复核", "复核中"}
    logs = list(item.rectification_log or [discovery_event(item, db.get(User, item.user_id))])
    assigned_manager = next((event for event in reversed(logs) if event["role"] in {"project_manager", "admin"} and event["operation"] != "assessment"), None)
    manager = user.role == "admin" or (user.role == "project_manager" and (not assigned_manager or assigned_manager["actor_id"] == user.id))
    transitions = [event for event in logs if event["operation"] in {"advance", "withdraw", "reject"}]
    index = STAGES.index(current)
    if payload.operation != "edit" and payload.edit_event_id:
        raise HTTPException(status_code=422, detail="只有修改操作可以指定处理记录")
    if payload.operation == "edit":
        if not payload.edit_event_id or current == "已闭环" or payload.status != current:
            raise HTTPException(status_code=409, detail="当前阶段不能修改该处理记录")
        editable = logs[0] if logs else None
        if not editable or editable.get("id") != payload.edit_event_id or editable.get("actor_id") != user.id or editable.get("to_status") != current or editable.get("operation") not in {"save_progress", "advance", "edit"}:
            raise HTTPException(status_code=403, detail="只能修改本人当前阶段最近一次处理记录")
        if not (reviewer if review_stage else manager):
            raise HTTPException(status_code=403, detail="当前角色不能修改该处理记录")
        if current == "复核中" and payload.review_result == "合格":
            if not payload.rectification_photo_data or not payload.review_measured_value.strip() or not payload.review_standard_value.strip():
                raise HTTPException(status_code=422, detail="合格复核记录必须包含检测数据、标准和现场照片")
            validate_review_data(item, payload)
    elif payload.operation == "withdraw":
        if index == 0 or payload.status != STAGES[index - 1]:
            raise HTTPException(status_code=409, detail="只能撤回到上一个阶段")
        last = transitions[0] if transitions else None
        if not last or last["operation"] != "advance" or last["to_status"] != current or (last["actor_id"] != user.id and user.role != "admin"):
            raise HTTPException(status_code=403, detail="只有上次阶段提交人可以撤回；其他人员请退回整改")
    else:
        if not (reviewer if review_stage else manager) or current == "已闭环":
            raise HTTPException(status_code=403, detail="复核由安全管理员或系统超级管理员负责，整改与最终确认由项目经理负责")
        if payload.operation == "save_progress":
            if payload.status != current:
                raise HTTPException(status_code=409, detail="保存进展不能修改阶段")
        elif payload.operation == "reject":
            if current not in {"待复核", "复核中", "待项目经理确认"} or payload.status != "整改中":
                raise HTTPException(status_code=409, detail="当前阶段不能退回整改")
        elif payload.operation == "advance":
            if index == len(STAGES) - 1 or payload.status != STAGES[index + 1]:
                raise HTTPException(status_code=409, detail="只能进入相邻的下一阶段")
            if current == "复核中" and (payload.review_result != "合格" or not payload.rectification_photo_data or not payload.review_measured_value.strip() or not payload.review_standard_value.strip()):
                raise HTTPException(status_code=422, detail="复核提交必须填写检测数据和标准、上传照片并确认合格")
            if current == "复核中":
                validate_review_data(item, payload)
            if current == "待项目经理确认" and (item.review_result != "合格" or not item.rectification_photo_data):
                raise HTTPException(status_code=422, detail="缺少有效的安全员复核结论或照片，请退回整改")

    if current == "待项目经理确认" and payload.rectification_photo_data:
        raise HTTPException(status_code=403, detail="安全员复核完成后，项目经理不能替换复核照片")

    if (payload.review_result or payload.review_measured_value or payload.review_standard_value) and not (reviewer and current == "复核中"):
        raise HTTPException(status_code=403, detail="检测数据及复核结论只能由安全管理员或系统超级管理员在复核中填写")
    now = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M:%S")
    event = {
        "id": str(uuid4()), "operation": payload.operation, "actor_id": user.id,
        "actor": user.display_name, "role": user.role, "created_at": now,
        "from_status": current, "to_status": payload.status, "note": payload.note.strip(),
        "photo_name": payload.rectification_photo_name, "photo_data": payload.rectification_photo_data,
        "measured_value": payload.review_measured_value, "standard_value": payload.review_standard_value,
        "review_result": payload.review_result,
    }
    if payload.operation == "edit":
        event["edited_event_id"] = payload.edit_event_id
    values = {"status": payload.status, "rectification_log": [event, *logs], "workflow_version": item.workflow_version + 1}
    if payload.rectification_photo_data or (payload.operation == "edit" and index < 4):
        values.update(rectification_photo_data=payload.rectification_photo_data, rectification_photo_name=payload.rectification_photo_name)
    if reviewer and current == "复核中":
        values.update(review_result=payload.review_result, review_measured_value=payload.review_measured_value, review_standard_value=payload.review_standard_value)
    if payload.operation in {"reject", "withdraw"} and payload.status != "待项目经理确认":
        values.update(review_result="", review_measured_value="", review_standard_value="", rectification_photo_data="", rectification_photo_name="")
    result = db.execute(update(HazardAssessment).where(HazardAssessment.id == item.id, HazardAssessment.workflow_version == payload.expected_version).values(**values))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="处理记录已被更新，请刷新后重试")
    db.commit()
    db.refresh(item)
    return to_response(item, db)
