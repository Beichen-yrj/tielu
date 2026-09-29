from __future__ import annotations

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from .auth import get_current_user
from .config import get_settings
from .models import User
from .schemas import AiChatRequest, AiChatResponse


router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """你是铁路危险货物运输“双重预防机制”平台的安全辅助助手。
请使用中文简洁回答，并结合用户提供的脱敏业务摘要给出可执行建议。
你只能提供辅助研判，不得声称替代安全专业人员、法定检查或正式评审；不得自动改变风险等级、生成正式隐患、完成整改销号。风险阈值为当前系统演示规则，引用时必须提醒由业务负责人确认。若信息不足，应明确指出需补充的检测数据，不得编造法规条款、检测结果或现场事实。"""


@router.post("/chat", response_model=AiChatResponse)
async def chat(payload: AiChatRequest, _: User = Depends(get_current_user)) -> AiChatResponse:
    settings = get_settings()
    if not settings.deepseek_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI 服务尚未配置，请在后端设置 DEEPSEEK_API_KEY",
        )

    context_json = json.dumps(payload.context.model_dump(), ensure_ascii=False)
    request_body = {
        "model": settings.deepseek_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"平台业务摘要：{context_json}\n\n用户问题：{payload.question}",
            },
        ],
        "temperature": 0.2,
        "max_tokens": 1000,
        "stream": False,
    }
    url = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=8.0)) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI 服务响应超时，请稍后重试") from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 服务返回异常，请检查后端配置") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="暂时无法连接 AI 服务，请稍后重试") from exc

    try:
        data = response.json()
        answer = data["choices"][0]["message"]["content"].strip()
    except (ValueError, KeyError, IndexError, AttributeError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 服务返回了无法识别的数据") from exc
    if not answer:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI 服务未返回有效回答")
    return AiChatResponse(answer=answer, model=settings.deepseek_model)
