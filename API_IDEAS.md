# Uptime Kuma MCP - API Method Ideas for LLM Integration

This document outlines useful API methods that would enhance the LLM's ability to interact with Uptime Kuma effectively.

---

## 🔍 **Status & Health Monitoring**

### `get_monitor_status_by_id`

- **Inputs**: `id: number`
- **Outputs**: `{ id, name, status: 'up' | 'down' | 'pending', uptime: number, ping: number, lastCheck: timestamp }`
- **Purpose**: Get current real-time status of a monitor without full config details

### `get_monitors_by_status`

- **Inputs**: `status: 'up' | 'down' | 'pending' | 'paused'`
- **Outputs**: `Array<MonitorSummary>` (same fields as findMonitorsByName)
- **Purpose**: Find all monitors in a specific state (e.g., "show me all down monitors")

### `get_monitor_heartbeats_by_id`

- **Inputs**: `id: number, limit?: number` (default 24)
- **Outputs**: `Array<{ timestamp, status: 0|1|2, ping, message }>`
- **Purpose**: Get recent heartbeat history for debugging or analysis

---

## 📊 **Bulk Operations**

### `pause_monitors_by_name`

- **Inputs**: `searchTerm: string, useRegex?: boolean`
- **Outputs**: `{ paused: number, monitors: Array<{ id, name }> }`
- **Purpose**: Pause multiple monitors matching a pattern (e.g., "pause all staging monitors")

### `resume_monitors_by_name`

- **Inputs**: `searchTerm: string, useRegex?: boolean`
- **Outputs**: `{ resumed: number, monitors: Array<{ id, name }> }`
- **Purpose**: Resume multiple monitors matching a pattern

### `bulk_update_monitors`

- **Inputs**: `ids: number[], updates: Partial<MonitorConfig>`
- **Outputs**: `{ updated: number, failed: number, results: Array<{ id, success, error? }> }`
- **Purpose**: Update multiple monitors at once (e.g., "change interval to 120s for all HTTP monitors")

---

## 🏷️ **Tag/Group Management**

### `list_tags`

- **Inputs**: none
- **Outputs**: `Array<{ id, name, color, monitorCount }>`
- **Purpose**: Get all available tags in the system

### `get_monitors_by_tag`

- **Inputs**: `tagName: string`
- **Outputs**: `Array<MonitorSummary>`
- **Purpose**: Find all monitors with a specific tag

### `add_tag_to_monitor`

- **Inputs**: `monitorId: number, tagName: string, color?: string`
- **Outputs**: `{ success: boolean, tag: { id, name, color } }`
- **Purpose**: Tag a monitor for organization

---

## 🔔 **Notifications**

### `list_notifications`

- **Inputs**: none
- **Outputs**: `Array<{ id, name, type: 'slack' | 'email' | 'discord', active, default }>`
- **Purpose**: Get all configured notification channels

### `attach_notification_to_monitor`

- **Inputs**: `monitorId: number, notificationId: number`
- **Outputs**: `{ success: boolean }`
- **Purpose**: Link a notification channel to a monitor

### `get_monitor_notifications_by_id`

- **Inputs**: `id: number`
- **Outputs**: `Array<{ id, name, type, active }>`
- **Purpose**: See which notifications are configured for a monitor

---

## 📈 **Statistics & Reporting**

### `get_uptime_summary`

- **Inputs**: `monitorId?: number, period?: '24h' | '7d' | '30d' | '1y'`
- **Outputs**: `{ uptime: number, totalUp: number, totalDown: number, avgPing: number }`
- **Purpose**: Get uptime statistics (for one monitor or overall system)

### `get_incident_summary`

- **Inputs**: `monitorId?: number, limit?: number`
- **Outputs**: `Array<{ start, end, duration, resolved, monitorId, monitorName }>`
- **Purpose**: Get recent downtime incidents

### `get_monitors_summary`

- **Inputs**: none
- **Outputs**: `{ total, up, down, paused, pending, totalUptime: number }`
- **Purpose**: Dashboard-style overview of all monitors

---

## 🔄 **Monitor Discovery & Filtering**

### `find_monitors_by_type`

- **Inputs**: `type: MonitorType | MonitorType[]`
- **Outputs**: `Array<MonitorSummary>`
- **Purpose**: Find all monitors of specific type(s) (e.g., "show all HTTP monitors")

### `find_monitors_by_url`

- **Inputs**: `urlPattern: string, useRegex?: boolean`
- **Outputs**: `Array<MonitorSummary>`
- **Purpose**: Find monitors by URL pattern (e.g., "all monitors checking *.example.com")

### `find_inactive_monitors`

- **Inputs**: `daysInactive?: number` (default 7)
- **Outputs**: `Array<MonitorSummary & { lastCheck: timestamp }>`
- **Purpose**: Find monitors that haven't been checked recently

---

## 🛠️ **Maintenance**

### `get_maintenance_windows`

- **Inputs**: none
- **Outputs**: `Array<{ id, title, start, end, active, monitors: number[] }>`
- **Purpose**: List scheduled maintenance windows

### `create_maintenance_window`

- **Inputs**: `{ title, start, end, monitorIds: number[] }`
- **Outputs**: `{ id, title, start, end }`
- **Purpose**: Schedule maintenance to prevent false alerts

### `pause_monitor_with_maintenance`

- **Inputs**: `monitorId: number, durationMinutes: number, reason?: string`
- **Outputs**: `{ success: boolean, resumeAt: timestamp }`
- **Purpose**: Temporarily pause with auto-resume

---

## 🎯 **Smart Suggestions (LLM-Friendly)**

### `suggest_monitor_improvements`

- **Inputs**: `monitorId: number`
- **Outputs**: `Array<{ type: 'interval' | 'timeout' | 'retries', current, suggested, reason }>`
- **Purpose**: Analyze monitor config and suggest optimizations

### `validate_monitor_config`

- **Inputs**: `config: Partial<MonitorConfig>`
- **Outputs**: `{ valid: boolean, errors: string[], warnings: string[] }`
- **Purpose**: Pre-validate monitor config before creation

### `duplicate_monitor`

- **Inputs**: `sourceId: number, newName: string, changes?: Partial<MonitorConfig>`
- **Outputs**: `Monitor`
- **Purpose**: Clone a monitor with modifications

---

## 💡 **Key Benefits for LLMs**

1. **Status queries** - LLMs can quickly check "what's down?" without parsing full configs
2. **Bulk operations** - Natural language like "pause all staging monitors" becomes simple
3. **Tag-based queries** - Semantic grouping makes sense to LLMs
4. **Summary views** - Reduce token usage with focused, minimal outputs
5. **Maintenance windows** - LLMs can manage scheduled downtime intelligently
6. **Pattern matching** - Regex support allows flexible queries
7. **Statistics** - LLMs can analyze trends and suggest actions

---

## 🎖️ **Priority Implementation Recommendations**

### High Priority (Most Impactful)

- ✅ **Status queries** (`get_monitors_by_status`, `get_monitor_status_by_id`)
  - Most common LLM need - "what's broken?"
- ✅ **Bulk operations** (`pause_monitors_by_name`, `resume_monitors_by_name`)
  - Natural language efficiency - "pause all staging monitors"
- ✅ **Summary/statistics** (`get_monitors_summary`, `get_uptime_summary`)
  - Decision making and reporting

### Medium Priority (Useful)

- 🟡 **Tag management** (all tag-related methods)
  - Semantic organization and grouping
- 🟡 **Heartbeat history** (`get_monitor_heartbeats_by_id`)
  - Debugging and trend analysis
- 🟡 **Monitor discovery** (`find_monitors_by_type`, `find_monitors_by_url`)
  - Better search capabilities

### Lower Priority (Nice to Have)

- 🟢 **Maintenance windows** (all maintenance methods)
  - Advanced scheduling features
- 🟢 **Smart suggestions** (`suggest_monitor_improvements`, `validate_monitor_config`)
  - AI-assisted configuration
- 🟢 **Notification management** (notification-related methods)
  - Alert configuration

---

## 📝 **Implementation Notes**

### Design Principles

1. **Minimal outputs** - Return only essential fields to reduce token usage
2. **Consistent patterns** - Use similar input/output structures across related methods
3. **Regex support** - Enable flexible pattern matching where applicable
4. **Batch operations** - Support bulk actions for efficiency
5. **Clear descriptions** - Help LLMs understand when to use each method

### Common Output Format

All search/filter methods should return `MonitorSummary` type:

```typescript
{
  id: number
  name: string
  url?: string
  description?: string
  type: string
  pathName?: string
  hostname?: string
  port?: number
  active: boolean
}
```

### Error Handling

All methods should return consistent error structures:

```typescript
{
  success: boolean
  error?: string
  details?: any
}
```
