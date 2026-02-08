import { describe, it, expect } from 'vitest'
import { redactData } from '../src/redact'

describe('PII Pattern Redaction', () => {
  it('redacts email addresses', () => {
    const data = {
      message: 'Contact user@example.com for details',
      email: 'admin@test.org'
    }

    const result = redactData(data, {
      patterns: ['email']
    })

    expect(result.message).toBe('Contact [REDACTED] for details')
    expect(result.email).toBe('[REDACTED]')  // Patterns redact all matching strings
  })

  it('redacts SSN numbers', () => {
    const data = {
      ssn: '123-45-6789',
      message: 'SSN is 987-65-4321'
    }

    const result = redactData(data, {
      patterns: ['ssn']
    })

    expect(result.message).toBe('SSN is [REDACTED]')
  })

  it('redacts credit card numbers', () => {
    const data = {
      card: '4532 1234 5678 9010',
      message: 'Card 5555-4444-3333-2222 charged'
    }

    const result = redactData(data, {
      patterns: ['creditCard']
    })

    expect(result.message).toBe('Card [REDACTED] charged')
  })

  it('redacts phone numbers', () => {
    const data = {
      message: 'Call +1-555-123-4567 or (555) 987-6543'
    }

    const result = redactData(data, {
      patterns: ['phone']
    })

    expect(result.message).toContain('[REDACTED]')
  })

  it('redacts IP addresses', () => {
    const data = {
      message: 'Request from 192.168.1.1 blocked',
      ip: '10.0.0.5'
    }

    const result = redactData(data, {
      patterns: ['ip']
    })

    expect(result.message).toBe('Request from [REDACTED] blocked')
  })

  it('redacts JWT tokens', () => {
    const data = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    }

    const result = redactData(data, {
      patterns: ['jwt']
    })

    expect(result.token).toBe('[REDACTED]')
  })

  it('supports multiple patterns', () => {
    const data = {
      message: 'Email user@test.com, SSN 123-45-6789, IP 192.168.1.1'
    }

    const result = redactData(data, {
      patterns: ['email', 'ssn', 'ip']
    })

    expect(result.message).toBe('Email [REDACTED], SSN [REDACTED], IP [REDACTED]')
  })

  it('supports custom patterns', () => {
    const data = {
      apiKey: 'sk_live_1234567890abcdef',
      message: 'Using key sk_test_abcdef123456'
    }

    const result = redactData(data, {
      customPatterns: [
        { name: 'stripeKey', regex: /sk_(live|test)_[a-zA-Z0-9]+/g }
      ]
    })

    expect(result.message).toBe('Using key [REDACTED]')
  })

  it('supports custom redaction function', () => {
    const data = {
      password: 'secret123',
      apiKey: 'key-abc',
      username: 'john'
    }

    const result = redactData(data, {
      custom: (key, value) => {
        if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
          return '[HIDDEN]'
        }
        if (key === 'apiKey') {
          return '***'
        }
        return value
      }
    })

    expect(result.password).toBe('[HIDDEN]')
    expect(result.apiKey).toBe('***')
    expect(result.username).toBe('john')
  })

  it('combines patterns, keys, and custom functions', () => {
    const data = {
      email: 'user@test.com',
      password: 'secret',
      message: 'Contact admin@example.com with SSN 123-45-6789'
    }

    const result = redactData(data, {
      patterns: ['email', 'ssn'],
      keys: ['password'],
      custom: (key, value) => {
        if (key === 'email') return '***@***.***'
        return value
      }
    })

    expect(result.email).toBe('***@***.***')
    expect(result.password).toBe('[REDACTED]')
    expect(result.message).toBe('Contact [REDACTED] with SSN [REDACTED]')
  })
})
