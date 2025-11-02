import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, context, history } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build the conversation history for context
    const conversationHistory = history?.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })) || []

    // Add the current message
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // Prepare the system message with context
    const systemMessage = {
      role: 'system',
      content: context || 'You are an AI learning assistant for an LMS platform. Provide helpful, educational responses. Be encouraging and supportive. Keep responses concise but informative.'
    }

    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [systemMessage, ...conversationHistory],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, response.statusText)
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from AI service')
    }

    const aiResponse = data.choices[0].message.content

    return NextResponse.json({
      response: aiResponse,
      usage: data.usage
    })

  } catch (error) {
    console.error('Chat API error:', error)

    // Return a fallback response
    return NextResponse.json({
      response: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or contact support if the issue persists.",
      error: true
    }, { status: 500 })
  }
}