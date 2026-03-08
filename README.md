<picture>
  <img src="./docs/icon.webp" alt="">
</picture>

<picture height="0">
  <source media="(min-width: 769px)" srcset="./docs/pixel.png" width="0" height="0">
  <img src="./docs/icon.webp" alt="research.actor Logo" width="150">
</picture>

<div>
    <h1>
        <picture>
            <source media="(max-width: 768px)" srcset="./docs/pixel.png" width="0" height="0">
            <img src="./docs/icon.webp" alt="research.actor Logo" width="225" align="left">
        </picture>
        research.actor
    </h1>
    <p>
      <strong>Cacheable codebase exploration for AI coding agents.</strong> Stop re-exploring. Start caching. Run a full codebase analysis once per git commit, cache it, and serve it instantly to AI agents. <br /><br />
        <a href="https://research.actor" target="_blank">Website</a> |
        <a href="https://github.com/mateffy/research.actor#readme" target="_blank">Documentation</a>
    </p>
</div>



<br />
<br />

```bash
npm install -g research.actor
```

```bash
research
```

```json
{
  "analysis": "Express API with 12 routes...",
  "fromCache": true,
  "gitHash": "abc123"
}
```

<div align="center">
    <h6>or with specific questions...</h6>
</div>

```bash
research --prompt "explain the auth flow"
```

---

## Contents

- [CLI usage](#cli-usage)
- [SDK usage](#sdk-usage)
  - [Basic](#basic)
  - [Persistent cache with FsStore](#persistent-cache-with-fsstore)
  - [Custom cache store](#custom-cache-store)
  - [Custom runner (in-process agent)](#custom-runner-in-process-agent)
  - [Cache expiry with maxAge](#cache-expiry-with-maxage)
  - [Error handling](#error-handling)
- [API reference](#api-reference)
- [Package structure](#package-structure)

---
