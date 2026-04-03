import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude 会话类
 * 管理单个 Claude 会话的对话历史和 API 调用
 */
class ClaudeSession {
    private client: Anthropic;
    private conversationHistory: Anthropic.MessageParam[] = [];

    constructor(
        private role: string,
        private systemPrompt: string,
        apiKey: string
    ) {
        this.client = new Anthropic({ apiKey });
    }

    async sendMessage(userMessage: string): Promise<string> {
        // 添加用户消息到历史
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        // 调用 Claude API
        const response = await this.client.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: this.systemPrompt,
            messages: this.conversationHistory
        });

        // 提取响应文本
        const assistantMessage = response.content
            .filter(block => block.type === 'text')
            .map(block => (block as Anthropic.TextBlock).text)
            .join('\n');

        // 添加助手消息到历史
        this.conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        return assistantMessage;
    }

    getRole(): string {
        return this.role;
    }

    getHistoryLength(): number {
        return this.conversationHistory.length;
    }
}

/**
 * 多 Claude 会话管理器
 * 管理多个不同角色的 Claude 会话
 */
class MultiClaudeSessionManager {
    private sessions = new Map<string, ClaudeSession>();
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * 创建一个新的角色会话
     */
    createSession(role: string): void {
        const systemPrompt = this.getSystemPromptForRole(role);
        const session = new ClaudeSession(role, systemPrompt, this.apiKey);
        this.sessions.set(role, session);
    }

    /**
     * 向指定角色发送消息
     */
    async sendToRole(role: string, message: string): Promise<string> {
        const session = this.sessions.get(role);
        if (!session) {
            throw new Error(`Session for role "${role}" not found`);
        }
        return await session.sendMessage(message);
    }

    /**
     * 获取所有会话的状态
     */
    getSessionsStatus(): Array<{ role: string; messageCount: number }> {
        return Array.from(this.sessions.entries()).map(([role, session]) => ({
            role,
            messageCount: session.getHistoryLength()
        }));
    }

    /**
     * 根据角色获取 system prompt
     */
    private getSystemPromptForRole(role: string): string {
        const prompts: Record<string, string> = {
            'frontend': `你是一个专业的前端开发工程师。你的职责是：
- 实现 UI 组件和页面
- 使用 React、TypeScript、CSS
- 确保代码符合前端最佳实践
- 与后端 API 集成

当前项目技术栈：React 18, TypeScript, Tailwind CSS`,

            'backend': `你是一个专业的后端开发工程师。你的职责是：
- 实现 API 接口
- 设计数据库模型
- 处理业务逻辑
- 确保代码安全和性能

当前项目技术栈：Node.js, Express, PostgreSQL`,

            'test': `你是一个专业的测试工程师。你的职责是：
- 编写单元测试和集成测试
- 发现代码中的 bug
- 验证功能是否符合需求
- 提供测试报告

使用的测试框架：Jest, React Testing Library`,

            'review': `你是一个资深的代码审查专家。你的职责是：
- 审查代码质量
- 发现潜在问题
- 提供改进建议
- 确保代码符合团队规范`
        };

        return prompts[role] || '你是一个专业的软件工程师。';
    }
}

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('[MultiClaudeSession] Extension activated');

    // 从配置中获取 API Key
    const config = vscode.workspace.getConfiguration('multiClaudeSession');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
        vscode.window.showErrorMessage(
            'Please set your Anthropic API key in settings: multiClaudeSession.apiKey'
        );
        return;
    }

    // 创建会话管理器
    const sessionManager = new MultiClaudeSessionManager(apiKey);

    // 注册命令：创建会话
    const createSessionCmd = vscode.commands.registerCommand(
        'multi-claude-session.createSession',
        async () => {
            const role = await vscode.window.showQuickPick(
                ['frontend', 'backend', 'test', 'review'],
                { placeHolder: 'Select a role for the new session' }
            );

            if (role) {
                sessionManager.createSession(role);
                vscode.window.showInformationMessage(`Created ${role} session`);
            }
        }
    );

    // 注册命令：发送消息
    const sendMessageCmd = vscode.commands.registerCommand(
        'multi-claude-session.sendMessage',
        async () => {
            // 选择角色
            const sessions = sessionManager.getSessionsStatus();
            if (sessions.length === 0) {
                vscode.window.showWarningMessage('No sessions created yet');
                return;
            }

            const role = await vscode.window.showQuickPick(
                sessions.map(s => s.role),
                { placeHolder: 'Select a role to send message to' }
            );

            if (!role) return;

            // 输入消息
            const message = await vscode.window.showInputBox({
                prompt: `Enter message for ${role}`,
                placeHolder: 'Type your message here...'
            });

            if (!message) return;

            // 发送消息并显示响应
            try {
                vscode.window.showInformationMessage(`Sending to ${role}...`);
                const response = await sessionManager.sendToRole(role, message);

                // 在新的编辑器中显示响应
                const doc = await vscode.workspace.openTextDocument({
                    content: `# Response from ${role}\n\n${response}`,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );

    // 注册命令：查看会话状态
    const showStatusCmd = vscode.commands.registerCommand(
        'multi-claude-session.showStatus',
        () => {
            const sessions = sessionManager.getSessionsStatus();
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('No sessions created yet');
                return;
            }

            const status = sessions
                .map(s => `${s.role}: ${s.messageCount} messages`)
                .join('\n');

            vscode.window.showInformationMessage(`Sessions:\n${status}`);
        }
    );

    context.subscriptions.push(createSessionCmd, sendMessageCmd, showStatusCmd);
}

export function deactivate() {}
