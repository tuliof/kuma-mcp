import type {
  AddMonitorTagInput,
  AddTagInput,
  DeleteMonitorTagInput,
  DeleteTagInput,
  EditMonitorTagInput,
  EditTagInput,
} from './schemas.js'
import type { SocketContext, Tag } from './types.js'

export async function getTags(context: SocketContext): Promise<Tag[]> {
  const response = (await context.socket.emitWithAck('getTags')) as {
    ok: boolean
    tags?: Tag[]
    msg?: string
  }
  if (!response.ok || !response.tags) {
    throw `Failed to get tags: ${response.msg || 'Unknown error'}`
  }
  return response.tags
}

export async function addTag(context: SocketContext, input: AddTagInput): Promise<Tag> {
  const response = (await context.socket.emitWithAck('addTag', input)) as {
    ok: boolean
    tag?: Tag
    msg?: string
  }
  if (!response.ok || !response.tag) {
    throw `Failed to add tag: ${response.msg || 'Unknown error'}`
  }
  return response.tag
}

export async function editTag(context: SocketContext, input: EditTagInput): Promise<Tag> {
  const response = (await context.socket.emitWithAck('editTag', input)) as {
    ok: boolean
    tag?: Tag
    msg?: string
  }
  if (!response.ok || !response.tag) {
    throw `Failed to edit tag: ${response.msg || 'Unknown error'}`
  }
  return response.tag
}

export async function deleteTag(context: SocketContext, input: DeleteTagInput): Promise<void> {
  const response = (await context.socket.emitWithAck('deleteTag', input.id)) as {
    ok: boolean
    msg?: string
  }
  if (!response.ok) {
    throw `Failed to delete tag: ${response.msg || 'Unknown error'}`
  }
}

export async function addMonitorTag(
  context: SocketContext,
  input: AddMonitorTagInput,
): Promise<void> {
  const response = (await context.socket.emitWithAck(
    'addMonitorTag',
    input.tagId,
    input.monitorId,
    input.value ?? null,
  )) as { ok: boolean; msg?: string }

  if (!response.ok) {
    throw `Failed to add monitor tag: ${response.msg || 'Unknown error'}`
  }
}

export async function editMonitorTag(
  context: SocketContext,
  input: EditMonitorTagInput,
): Promise<void> {
  const response = (await context.socket.emitWithAck(
    'editMonitorTag',
    input.tagId,
    input.monitorId,
    input.value,
  )) as { ok: boolean; msg?: string }

  if (!response.ok) {
    throw `Failed to edit monitor tag: ${response.msg || 'Unknown error'}`
  }
}

export async function deleteMonitorTag(
  context: SocketContext,
  input: DeleteMonitorTagInput,
): Promise<void> {
  const response = (await context.socket.emitWithAck(
    'deleteMonitorTag',
    input.tagId,
    input.monitorId,
    input.value ?? null,
  )) as { ok: boolean; msg?: string }

  if (!response.ok) {
    throw `Failed to delete monitor tag: ${response.msg || 'Unknown error'}`
  }
}
