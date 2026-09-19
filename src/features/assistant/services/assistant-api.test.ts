import { describe, expect, it } from 'vitest'
import { parseSse } from './assistant-api'

describe('parseSse', () => {
  it('parses complete events and keeps the partial remainder', () => {
    const { events, rest } = parseSse('event: tool_call\ndata: {"tool":"get_deposit","args":{}}\n\nevent: final\ndata: {"te')
    expect(events).toEqual([{ type: 'tool_call', tool: 'get_deposit', args: {} }])
    expect(rest).toBe('event: final\ndata: {"te')
  })
  it('handles events without data and skips malformed ones', () => {
    const { events } = parseSse('event: done\ndata: {}\n\nevent: final\ndata: {oops\n\n')
    expect(events).toEqual([{ type: 'done' }])
  })
})
