# Security Policy

## Reporting Security Vulnerabilities

The GérerTales team takes security seriously. If you discover a security vulnerability, please report it privately.

**DO NOT** create a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email**: Send details to the repository owner (check GitHub profile)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (critical issues prioritized)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Security Best Practices

### Environment Variables

**CRITICAL**: Never commit `.env` files or API keys to version control.

- Use `.env.local` for local development
- Store production secrets in Netlify environment variables
- Rotate API keys if accidentally exposed

### API Keys

- xAI and OpenAI API keys are currently used with `dangerouslyAllowBrowser: true`
- **WARNING**: This exposes keys in client-side code
- **Recommended**: Implement server-side proxy for production (see [#api-proxy-setup](#api-proxy-setup))

### Data Privacy

- User data is stored in Supabase with Row Level Security (RLS)
- Admin privileges can only be granted server-side
- All authentication handled by Supabase Auth

## Known Security Considerations

### Client-Side API Keys

Currently, AI provider API keys (xAI, OpenAI) are accessible in the browser. While functional for development and trusted users, this is not recommended for public production deploys.

**Mitigation Options**:
1. Implement Netlify Functions as API proxy
2. Use Supabase Edge Functions for AI calls
3. Implement rate limiting and usage caps

### API Proxy Setup

To properly secure API keys in production:

```typescript
// Example: Netlify Function (netlify/functions/ai-proxy.ts)
export async function handler(event) {
  const { prompt } = JSON.parse(event.body);
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* AI request */ })
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify(await response.json())
  };
}
```

Then update client to call `/api/ai-proxy` instead of using keys directly.

## Audit History

- **2026-02-14**: Comprehensive security audit completed
  - Fixed privilege escalation risk in profile updates
  - Removed sensitive data logging
  - Secured `.gitignore` with environment file patterns
  - Created `.env.example` template
  - Moved hardcoded credentials to environment variables
