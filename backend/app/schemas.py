from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


USERNAME_PATTERN = re.compile(r"^[\w\u4e00-\u9fff.-]+$", re.UNICODE)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, min_length=2, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        cleaned = value.strip()
        if not USERNAME_PATTERN.fullmatch(cleaned):
            raise ValueError("账号只能包含中文、字母、数字、点、短横线和下划线")
        return cleaned


class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
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


class AiAssessmentContext(BaseModel):
    id: str = Field(max_length=40)
    name: str = Field(max_length=120)
    cargo: str = Field(max_length=100)
    station: str = Field(max_length=80)
    risk: str = Field(max_length=20)
    score: int = Field(ge=1, le=25)
    finding_count: int = Field(ge=0, le=1000)


class AiChatContext(BaseModel):
    assessment_count: int = Field(ge=0, le=100000)
    open_issue_count: int = Field(ge=0, le=100000)
    major_issue_count: int = Field(ge=0, le=100000)
    latest_assessment: AiAssessmentContext | None = None


class AiChatRequest(BaseModel):
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
