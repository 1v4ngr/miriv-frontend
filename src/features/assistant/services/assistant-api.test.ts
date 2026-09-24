import { describe, expect, it } from 'vitest'
import { parseAgUiStream } from './assistant-api'

describe('parseAgUiStream', () => {
  it('parses complete AG-UI events and keeps the partial remainder', () => {
    const { events, rest } = parseAgUiStream('data: {"type":"RUN_STARTED","threadId":"t","runId":"r"}\n\ndata: {"type":"TEXT_MES')
    expect(events).toEqual([{ type: 'RUN_STARTED', threadId: 't', runId: 'r' }])
    expect(rest).toBe('data: {"type":"TEXT_MES')
  })
  it('skips malformed blocks and blocks without a type', () => {
    const { events } = parseAgUiStream('data: {oops\n\ndata: {"no":"type"}\n\ndata: {"type":"RUN_FINISHED","threadId":"t","runId":"r"}\n\n')
    expect(events).toEqual([{ type: 'RUN_FINISHED', threadId: 't', runId: 'r' }])
  })
})
