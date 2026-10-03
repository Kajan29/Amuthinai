# Documentation

| Folder | Contents |
| --- | --- |
| `srs/` | Software Requirements Specification |
| `milestones/` | Milestone 01 and Milestone 02 reports |
| `api/` | REST API reference, generated from the running server |
| `diagrams/` | Architecture, ER and sequence diagrams |

## API reference

The server exposes an interactive Swagger UI at `http://localhost:3000/api/docs` while
`npm run start:dev` is running. To refresh the static copy in `api/openapi.json`:

```bash
cd backend
npm run openapi
```

## Conventions

Requirement identifiers (`FR1`…`FR12`, `NFR1`…) come from the SRS and are repeated as code
comments next to the implementation so each requirement is traceable both ways.
