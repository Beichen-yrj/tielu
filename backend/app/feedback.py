from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Feedback, User
from .schemas import FeedbackCreate, FeedbackReply, FeedbackResponse


router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def to_response(feedback: Feedback, submitter: User | None) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id,
        category=feedback.category,
        title=feedback.title,
        content=feedback.content,
        status=feedback.status,
        reply=feedback.reply,
        replied_by=feedback.replied_by,
        created_at=feedback.created_at.strftime("%Y-%m-%d %H:%M"),
        replied_at=feedback.replied_at.strftime("%Y-%m-%d %H:%M") if feedback.replied_at else None,
        submitter=(submitter.display_name if submitter else "未知用户"),
        username=(submitter.username if submitter else "-"),
    )


def require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可执行该操作")


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(payload: FeedbackCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FeedbackResponse:
    feedback = Feedback(
        user_id=user.id,
        category=payload.category.strip(),
        title=payload.title.strip(),
        content=payload.content.strip(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return to_response(feedback, user)


@router.get("", response_model=list[FeedbackResponse])
def list_feedback(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[FeedbackResponse]:
    is_admin = user.role == "admin"
    statement = select(Feedback).order_by(Feedback.created_at.desc())
    if not is_admin:
        statement = statement.where(Feedback.user_id == user.id)
    records = list(db.scalars(statement))
    submitters: dict[int, User] = {}
    ids = {record.user_id for record in records}
    if ids:
        for submitter in db.scalars(select(User).where(User.id.in_(ids))):
            submitters[submitter.id] = submitter
    return [to_response(record, submitters.get(record.user_id)) for record in records]


@router.post("/{feedback_id}/reply", response_model=FeedbackResponse)
def reply_feedback(
    feedback_id: int,
    payload: FeedbackReply,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    require_admin(user)
    feedback = db.get(Feedback, feedback_id)
    if feedback is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="反馈记录不存在")
    feedback.reply = payload.reply.strip()
    feedback.status = "已回复"
    feedback.replied_by = f"{user.display_name}（管理员）"
    feedback.replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(feedback)
    submitter = db.get(User, feedback.user_id)
    return to_response(feedback, submitter)
