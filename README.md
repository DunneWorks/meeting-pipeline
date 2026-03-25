# Meeting Transcription Pipeline

Automated pipeline that captures WebEx meeting content via Fireflies.ai, processes it with Claude AI, and stores structured notes in Notion.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WEBEX MEETING                                 │
│   User schedules/starts meeting → Fireflies Bot joins automatically  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       FIREFLIES.AI                                   │
│   Bot records & transcribes → Sends webhook when meeting ends       │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE WORKER                               │
│   Receives webhook → Claude AI processes transcript → Scores quality │
└─────────────────────────────────┬───────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          NOTION                                       │
│   Creates pages in 3 databases → Meeting owner notified            │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

- **Real-time Webhook Processing**: Triggered when Fireflies.ai completes transcription
- **AI Quality Scoring**: Claude assigns confidence scores to ideas and decisions
- **Multi-Database Storage**: Separate Notion databases for meeting notes, visual analysis, and official records
- **Priority Auto-Assignment**: Based on confidence scores
- **Screenshot Analysis**: Visual content from meetings analyzed by AI

## How It Works

1. **WebEx Meeting** - You start/join a WebEx meeting
2. **Fireflies Bot** - Joins automatically, records and transcribes
3. **Meeting Ends** - Fireflies sends webhook to our pipeline
4. **AI Processing** - Claude extracts key points, action items, decisions
5. **Quality Scoring** - Confidence scores assigned
6. **Notion Pages** - Created in 3 databases
7. **Review** - Meeting owner reviews and approves

## Databases

### DB1: Pipeline (Meeting Notes)
- Meeting title, date, attendees
- Key points, action items, decisions
- Idea Confidence Score, Decision Approval Score
- Priority (auto-calculated)
- Status (Needs Review → Official)

### DB2: Visual Analysis
- Screenshots with AI interpretation
- Context, intent, analysis, conclusion
- Confidence score per image

### DB3: Official Record
- Merged content from text + visuals
- Categorized findings
- Quality score
- Review status

## Scoring System

| Score | Decision Approval | Idea Confidence |
|-------|------------------|-----------------|
| 1-3 | Proposed (tentative) | Raw/tentative |
| 4-6 | Aligned (on board) | Forming |
| 7-10 | Approved (confirmed) | Confirmed |

**Priority Logic:**
- High: Both scores ≤ 3 (needs attention)
- Low: Both scores ≥ 7 (all good)
- Medium: Everything else

## Setup

### 1. Prerequisites

You need accounts for:
- **WebEx** - Your meeting platform
- **Fireflies.ai** - Meeting transcription service
- **Notion** - Note-taking database
- **Anthropic** - Claude AI API
- **Cloudflare** - Worker hosting (free tier available)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Set these secrets in Cloudflare:
```bash
npx wrangler secret put FIREFLIES_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put NOTION_API_KEY
```

Set these in `wrangler.toml`:
```toml
[vars]
NOTION_PIPELINE_DB="your_database_id"
NOTION_VISUAL_DB="your_database_id"
NOTION_OFFICIAL_DB="your_database_id"
NOTIFICATION_EMAIL="your@email.com"
```

### 4. Create Notion Databases

Create three databases in Notion:

**Pipeline Database:**
| Field | Type |
|-------|------|
| Meeting title | Title |
| Date | Date |
| Priority | Select |
| Status | Status |
| Idea Confidence Score | Number |
| Decision Approval Score | Number |
| Owner | Person |
| Key Points | Text |
| Action Items | Text |
| Decisions | Text |
| Transcript | Text |
| Link to DB2 (Visual Analysis) | URL |

**Visual Analysis Database:**
| Field | Type |
|-------|------|
| Title | Title |
| Confidence Score | Number |
| Source Meeting | Text |

**Official Record Database:**
| Field | Type |
|-------|------|
| Title | Title |
| Quality Score | Number |
| Review Status | Select |
| Source Meeting | Text |

### 5. Connect Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create an integration (internal)
3. Copy the API token
4. Open each database → `...` menu → Connections → Add your integration

### 6. Configure Fireflies + WebEx

#### Step 6a: Connect Fireflies to WebEx

1. Go to Fireflies.ai → Settings → Integrations
2. Click "Add Integration"
3. Select "WebEx"
4. Authenticate with your WebEx account
5. Grant permissions

#### Step 6b: Configure Auto-Join

1. Fireflies → Settings → Calendar
2. Enable "Auto-join WebEx meetings"
3. Or set specific meeting patterns

#### Step 6c: Set Up Webhook

1. Fireflies → Settings → Webhooks
2. Click "Add Webhook"
3. Set URL to: `https://your-worker.workers.dev/webhook/fireflies`
4. Enable events: "Meeting Completed"

### 7. Deploy

```bash
npm run deploy
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/fireflies` | POST | Fireflies webhook receiver |

## Development

```bash
# Run locally
npm run dev

# Type check
npm run typecheck

# Run tests
npm test
```

## Webhook Payload (from Fireflies)

```json
{
  "meeting": {
    "id": "meeting_id",
    "title": "Meeting Title",
    "date": "2026-03-25T10:00:00Z",
    "duration": 3600,
    "attendees": [
      { "name": "John", "email": "john@example.com" }
    ],
    "owner_email": "owner@example.com"
  },
  "transcript": "Full transcript text...",
  "transcript_segments": [...],
  "screenshots": ["url1", "url2"]
}
```

## Project Structure

```
meeting-pipeline/
├── src/
│   ├── index.ts              # Main pipeline orchestrator
│   ├── worker.ts             # Cloudflare Worker entry point
│   ├── types/                # TypeScript type definitions
│   ├── services/             # API clients (Fireflies, Claude, Notion)
│   ├── processors/            # Business logic processors
│   ├── prompts/              # AI prompt templates
│   └── models/               # Utility functions
├── tests/                    # Test files
├── wrangler.toml            # Cloudflare configuration
├── package.json
└── README.md
```

## License

MIT
