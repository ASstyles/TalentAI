# TALENTAI DISASTER RECOVERY & BACKUP SPECIFICATION

**Document Reference:** `DOC-OPS-010`  
**System:** TalentAI Enterprise Disaster Recovery (DR) & Business Continuity  
**Recovery Objectives:** RPO < 1 Hour, RTO < 30 Minutes  
**Classification:** SRE & Compliance Reference

---

## 1. Recovery Objectives & SLA

| Metric | Target | Description |
|:---|:---:|:---|
| **Recovery Point Objective (RPO)** | $\le 1$ hour | Maximum permissible data loss in the event of catastrophic failure. |
| **Recovery Time Objective (RTO)** | $\le 30$ mins | Maximum permissible platform downtime before complete service restoration. |
| **Availability SLA** | $99.95\%$ | Standard multi-region production SLA. |

---

## 2. Backup Architecture & Data Stores

### 2.1 Cloud Firestore Scheduled Export
- **Mechanism:** Google Cloud Managed Export triggered via Cloud Scheduler and Cloud Functions.
- **Frequency:** Hourly incremental backups, daily full backups.
- **Destination:** Dedicated multi-region Cloud Storage bucket with Object Versioning and 90-day retention lock (`talentai-firestore-backups-coldline`).
- **Export Command:**
  ```bash
  gcloud firestore export gs://talentai-firestore-backups-coldline/$(date +%Y%m%d_%H%M%S)
  ```

### 2.2 Point-in-Time Recovery (PITR)
- **Granularity:** 7-day continuous PITR enabled across all Firestore databases.
- **Use Case:** Protection against accidental data deletion, transactional corruption, or malicious script mutations.
- **Restoration Command:**
  ```bash
  gcloud firestore databases restore \
    --source-database='(default)' \
    --destination-database='talentai-restored' \
    --restore-time='2026-11-23T00:00:00Z'
  ```

### 2.3 Redis State & Volume Persistence
- **Snapshot Policy:** Automated RDB snapshots saved to Docker named volume `redis-data` (`--save 60 1` and `--save 300 10`).
- **Disaster Recovery:** In total cluster loss, Redis automatically re-initializes sliding window rate limit counters in memory without blocking application traffic.

### 2.4 Cloud Storage (Resumes & Diplomas)
- **Redundancy:** Dual-region storage bucket with Object Versioning enabled.
- **Lifecycle Policy:** Auto-transition to Nearline after 30 days and Coldline after 90 days.

---

## 3. Disaster Recovery Restoration Procedure

In the event of total regional infrastructure loss:
1. **Container Re-instantiation:** Deploy latest Docker image from Google Artifact Registry to secondary region.
2. **Database Binding:** Re-point `FIREBASE_PROJECT_ID` or restore Firestore database from coldline bucket.
3. **DNS Failover:** Update Cloudflare / Cloud DNS records to secondary load balancer VIP.
4. **Readiness Probe Validation:** Run `bash scripts/verify-deployment.sh` against secondary endpoint to confirm green status before routing traffic.
