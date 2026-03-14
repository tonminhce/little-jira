const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function callGroq(messages: GroqMessage[], maxTokens = 500): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${error}`)
  }

  const data: GroqResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

// Generate a summary of issue activity
export async function generateIssueSummary(params: {
  title: string
  description: string | null
  status: string
  priority: string
  comments: Array<{ body: string; userName: string }>
  history: Array<{ field: string; oldValue: string | null; newValue: string | null }>
}): Promise<string> {
  const { title, description, status, priority, comments, history } = params

  const prompt = `You are a helpful project management assistant. Summarize the following issue in 2-3 sentences, highlighting the current status and any important updates.

Issue: ${title}
Description: ${description || 'No description'}
Status: ${status}
Priority: ${priority}

Recent comments (${comments.length}):
${comments.slice(-3).map(c => `- ${c.userName}: "${c.body.substring(0, 100)}"`).join('\n') || 'No comments'}

Recent changes:
${history.slice(-5).map(h => `- ${h.field} changed from "${h.oldValue || 'none'}" to "${h.newValue || 'none'}"`).join('\n') || 'No recent changes'}

Provide a concise summary:`

  try {
    return await callGroq([
      { role: 'system', content: 'You are a concise project management assistant. Provide brief, helpful summaries.' },
      { role: 'user', content: prompt },
    ], 200)
  } catch (error) {
    console.error('Failed to generate summary:', error)
    throw error
  }
}

// Enhance issue description
export async function enhanceIssueDescription(params: {
  title: string
  description: string
}): Promise<string> {
  const { title, description } = params

  const prompt = `You are a technical writing assistant. Improve the following issue description to be clearer, more structured, and more actionable. Keep the same meaning but make it professional and well-organized.

Title: ${title}
Current Description: ${description || 'No description provided'}

Enhanced description (keep it concise, use bullet points if appropriate):`

  try {
    return await callGroq([
      { role: 'system', content: 'You are a technical writing assistant. Improve descriptions while keeping them concise and clear.' },
      { role: 'user', content: prompt },
    ], 300)
  } catch (error) {
    console.error('Failed to enhance description:', error)
    throw error
  }
}

// Suggest priority based on issue details
export async function suggestPriority(params: {
  title: string
  description: string | null
}): Promise<{ priority: string; reason: string }> {
  const { title, description } = params

  const prompt = `You are a project management assistant. Based on the issue title and description, suggest an appropriate priority level.

Issue: ${title}
Description: ${description || 'No description'}

Respond in JSON format only:
{"priority": "HIGH|MEDIUM|LOW", "reason": "brief explanation"}

Priority guidelines:
- HIGH: Critical bugs, blocking issues, urgent deadlines
- MEDIUM: Standard features, improvements, non-critical bugs
- LOW: Nice-to-have, minor issues, future considerations

Response:`

  try {
    const response = await callGroq([
      { role: 'system', content: 'You are a project management assistant. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ], 100)

    // Parse JSON from response
    const jsonMatch = response.match(/\{[^}]+\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { priority: 'MEDIUM', reason: 'Could not determine priority' }
  } catch (error) {
    console.error('Failed to suggest priority:', error)
    return { priority: 'MEDIUM', reason: 'AI suggestion unavailable' }
  }
}

// Generate task breakdown suggestions
export async function suggestSubtasks(params: {
  title: string
  description: string | null
}): Promise<string[]> {
  const { title, description } = params

  const prompt = `You are a project management assistant. Suggest 3-5 subtasks that would help complete this issue. Keep each subtask short and actionable.

Issue: ${title}
Description: ${description || 'No description'}

Respond with a JSON array of strings only, no explanation:
["subtask 1", "subtask 2", "subtask 3"]`

  try {
    const response = await callGroq([
      { role: 'system', content: 'You are a project management assistant. Respond only with valid JSON arrays.' },
      { role: 'user', content: prompt },
    ], 200)

    // Parse JSON array from response
    const jsonMatch = response.match(/\[[^\]]+\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return []
  } catch (error) {
    console.error('Failed to suggest subtasks:', error)
    return []
  }
}

// Find similar issues (uses AI to compare)
export async function findSimilarIssues(params: {
  title: string
  description: string | null
  existingIssues: Array<{ id: string; title: string; description: string | null }>
}): Promise<Array<{ id: string; title: string; similarity: string }>> {
  const { title, description, existingIssues } = params

  if (existingIssues.length === 0) {
    return []
  }

  const issuesList = existingIssues
    .slice(0, 10)
    .map((issue, i) => `${i + 1}. [${issue.id}] ${issue.title}`)
    .join('\n')

  const prompt = `You are a project management assistant. Compare the new issue with existing issues and identify any that seem similar or related.

New Issue: ${title}
Description: ${description || 'No description'}

Existing Issues:
${issuesList}

Respond with a JSON array of similar issue IDs with similarity reason:
[{"id": "issue_id", "similarity": "brief reason"}]

Only include issues that are genuinely similar. If none are similar, return empty array [].`

  try {
    const response = await callGroq([
      { role: 'system', content: 'You are a project management assistant. Respond only with valid JSON arrays.' },
      { role: 'user', content: prompt },
    ], 200)

    // Parse JSON array from response
    const jsonMatch = response.match(/\[[^\]]*\]|\[\{[\s\S]+\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return []
  } catch (error) {
    console.error('Failed to find similar issues:', error)
    return []
  }
}
