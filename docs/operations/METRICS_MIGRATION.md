# Prometheus Metrics Migration

## Breaking change

Starting with the Nova Era API identity migration, the Prometheus metrics emitted by `GET /metrics` use the `nova_era_api_` prefix. The previous `evolution_` names are no longer emitted.

| Previous metric | New metric |
| --- | --- |
| `evolution_environment_info` | `nova_era_api_environment_info` |
| `evolution_instances_total` | `nova_era_api_instances_total` |
| `evolution_instance_up` | `nova_era_api_instance_up` |
| `evolution_instance_state` | `nova_era_api_instance_state` |

The example Prometheus job is now `nova-era-api`. Update queries, recording rules, alerts, dashboards and external consumers together with the API deployment. No compatibility aliases are emitted because those would continue distributing the prior product identity.

## Migration steps

1. Update Prometheus scrape jobs from `evolution-api` to `nova-era-api`.
2. Replace each metric name using the table above.
3. Import the updated [Grafana example](../../grafana-dashboard.json.example) or update each panel query.
4. Update alert names and expressions from [the Prometheus example](../../prometheus.yml.example).
5. Deploy the API and verify `GET /metrics` with the existing authentication and IP restrictions.

Metric series under the old names end when the prior deployment stops. Retention in Prometheus is historical data, not an active compatibility interface.
