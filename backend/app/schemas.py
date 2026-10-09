from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


USERNAME_PATTERN = re.compile(r"^[\w\u4e00-\u9fff.-]+$", re.UNICODE)
PUBLIC_ROLES = {"safety_manager", "project_manager", "ordinary"}


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, min_length=2, max_length=50)
    role: str = Field(default="ordinary", max_length=30)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned = value.strip()
        if not USERNAME_PATTERN.fullmatch(cleaned):
            raise ValueError("账号只能包含中文、字母、数字、点、短横线和下划线")
        return cleaned

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in PUBLIC_ROLES:
            raise ValueError("请选择安全管理员、项目经理或普通人员")
        return value


class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=1, max_length=128)
    role: str | None = Field(default=None, max_length=30)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    avatar_data: str = Field(default="", max_length=700_000)

    @field_validator("avatar_data")
    @classmethod
    def validate_avatar(cls, value: str) -> str:
        if value and not re.match(r"^data:image/(jpeg|png|webp);base64,", value):
            raise ValueError("头像仅支持 JPG、PNG 或 WebP 图片")
        return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    avatar_data: str | None = None
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    database: str


class AssessmentPayload(BaseModel):
    id: str = Field(min_length=3, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    station: str = Field(min_length=1, max_length=80)
    area: str = Field(min_length=1, max_length=100)
    cargo: str = Field(min_length=1, max_length=100)
    un_number: str = Field(default="", max_length=30)
    detector: str = Field(min_length=1, max_length=120)
    temperature: float
    pressure: float
    concentration: float
    static_checks: list[bool]
    likelihood: int = Field(ge=1, le=5)
    severity: int = Field(ge=1, le=5)
    risk: str = Field(max_length=20)
    score: int = Field(ge=1, le=25)
    status: str = Field(max_length=20)
    findings: list[str]
    measures: list[str]
    created_at: str = Field(max_length=40)


class AssessmentResponse(AssessmentPayload):
    model_config = ConfigDict(from_attributes=True)


class HazardAssessmentPayload(BaseModel):
    id: str = Field(min_length=3, max_length=40)
    task_name: str = Field(min_length=1, max_length=120)
    bureau: str = Field(default="", max_length=80)
    station: str = Field(min_length=1, max_length=80)
    area: str = Field(min_length=1, max_length=100)
    cargo: str = Field(min_length=1, max_length=100)
    un_number: str = Field(default="", max_length=30)
    inspector: str = Field(min_length=1, max_length=50)
    hazard_code: str = Field(min_length=1, max_length=20)
    stage: str = Field(min_length=1, max_length=20)
    dimension: str = Field(min_length=1, max_length=20)
    hazard_name: str = Field(min_length=1, max_length=160)
    basis: str = Field(min_length=1, max_length=4000)
    assessment_type: str = Field(pattern="^(静态|动态)$")
    data_name: str = Field(min_length=1, max_length=100)
    measured_value: str = Field(min_length=1, max_length=100)
    unit: str = Field(default="", max_length=30)
    standard_value: str = Field(default="", max_length=160)
    static_result: str = Field(default="", max_length=20)
    likelihood: int = Field(ge=1, le=5)
    severity: int = Field(ge=1, le=5)
    score: int = Field(ge=1, le=25)
    risk: str = Field(pattern="^(低|一般|较大|重大)$")
    has_hazard: bool
    finding: str = Field(default="", max_length=4000)
    action: str = Field(default="", max_length=4000)
    photo_name: str = Field(default="", max_length=180)
    photo_data: str = Field(default="", max_length=1_500_000)
    status: str = Field(default="已完成", max_length=20)
    created_at: str = Field(max_length=40)


class HazardAssessmentResponse(HazardAssessmentPayload):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    reviewer_name: str
    rectification_photo_name: str = ""
    rectification_photo_data: str = ""
    review_result: str = ""
    review_measured_value: str = ""
    review_standard_value: str = ""
    rectification_log: list[dict] = Field(default_factory=list)
    workflow_version: int = 0


class FeedbackCreate(BaseModel):
    category: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=2, max_length=120)
    content: str = Field(min_length=5, max_length=2000)


class FeedbackReply(BaseModel):
    reply: str = Field(min_length=2, max_length=2000)


class FeedbackResponse(BaseModel):
    id: int
    category: str
    title: str
    content: str
    status: str
    reply: str | None = None
    replied_by: str | None = None
    created_at: str
    replied_at: str | None = None
    submitter: str
    username: str


class AiAssessmentContext(BaseModel):
    id: str = Field(max_length=40)
    name: str = Field(max_length=120)
    cargo: str = Field(max_length=100)
    station: str = Field(max_length=80)
    risk: str = Field(max_length=20)
    score: int = Field(ge=1, le=25)
    finding_count: int = Field(ge=0, le=1000)


class AiChatContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessment_count: int = Field(ge=0, le=100000)
    open_issue_count: int = Field(ge=0, le=100000)
    major_issue_count: int = Field(ge=0, le=100000)
    latest_assessment: AiAssessmentContext | None = None


class AiChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=1000)
    context: AiChatContext

    @field_validator("question")
    @classmethod
    def clean_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("问题不能为空")
        return cleaned


class AiChatResponse(BaseModel):
    answer: str
    provider: str = "deepseek"
    model: str
