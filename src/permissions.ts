export type PlatformPage = '总览' | '风险评估' | '历史评估' | '隐患分析' | '整改闭环' | '历史分析' | '基础资料' | 'AI助手' | '个人中心'

const rolePages: Record<string, readonly PlatformPage[]> = {
  safety_manager: ['总览', '风险评估', '历史评估', '隐患分析', '历史分析', '整改闭环', 'AI助手', '个人中心'],
  project_manager: ['总览', '整改闭环', 'AI助手', '个人中心'],
  ordinary: ['总览', 'AI助手', '个人中心'],
  admin: ['总览', '风险评估', '历史评估', '隐患分析', '历史分析', '整改闭环', '基础资料', 'AI助手', '个人中心'],
}

export function canAccessPage(role: string, page: PlatformPage): boolean {
  return rolePages[role === 'operator' ? 'ordinary' : role]?.includes(page) ?? false
}
