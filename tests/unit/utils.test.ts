import { describe, expect, test } from 'bun:test'
import { MONITOR_TYPE_FIELDS } from '../../src/api/utils.ts'

const KNOWN_FIELD_NAMES = new Set([
  // Common
  'id',
  'name',
  'type',
  'url',
  'hostname',
  'port',
  'interval',
  'retryInterval',
  'maxretries',
  'resendInterval',
  'notificationIDList',
  'active',
  'timeout',
  'description',
  'parent',
  // HTTP-specific
  'method',
  'headers',
  'body',
  'keyword',
  'invertKeyword',
  'cacheBust',
  'upsideDown',
  'expiryNotification',
  'ignoreTls',
  'maxredirects',
  'accepted_statuscodes',
  'ipFamily',
  'proxyId',
  'dns_resolve_server',
  'dns_resolve_type',
  // Ping-specific
  'packetSize',
  'ping_count',
  'ping_numeric',
  'ping_per_request_timeout',
  // DNS-specific
  // JSON query
  'jsonPath',
  'jsonPathOperator',
  'expectedValue',
  // gRPC keyword
  'grpcUrl',
  'grpcProtobuf',
  'grpcBody',
  'grpcMetadata',
  'grpcMethod',
  'grpcServiceName',
  'grpcEnableTls',
  'keyword',
  'invertKeyword',
  // conditions / rabbitmq
  'conditions',
  'rabbitmq_nodes',
  // kafka
  'kafkaProducerTopic',
  'kafkaProducerBrokers',
  'kafkaProducerSaslOptions',
  'kafkaProducerMessage',
  'kafkaProducerSsl',
  'kafkaProducerAllowAutoTopicCreation',
])

for (const [type, fields] of Object.entries(MONITOR_TYPE_FIELDS)) {
  describe(`MONITOR_TYPE_FIELDS['${type}']`, () => {
    test('every field name maps to a known Uptime Kuma event field', () => {
      const unknown: string[] = []
      for (const f of fields) {
        if (!KNOWN_FIELD_NAMES.has(f)) {
          unknown.push(f)
        }
      }
      expect(unknown).toEqual([])
    })
  })
}
