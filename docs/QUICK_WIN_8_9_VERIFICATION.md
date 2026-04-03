# Quick Wins #8 & #9 — Verification & Testing Checklist

## Pre-Deployment Verification

### Code Quality ✅

- [x] TypeScript compilation passes
  ```bash
  $ npm run build
  ✓ Compiled successfully in 2.9s (No errors)
  ```

- [x] No unused variables or imports
- [x] All new functions properly typed
- [x] No implicit `any` types
- [x] All function call sites match updated signatures

### Static Analysis

- [x] Device detection covers all major user agents
  - iOS: `iPhone`, `iPad`
  - Android: `android`
  - Windows Phone: `windows phone`
  - Desktop: anything else

- [x] Threshold boundary conditions
  - $200 exactly → `priority: true` ✓
  - $199.99 → `priority: false` ✓
  - $0 (no price) → `priority: false` ✓

- [x] Backward compatibility
  - All new parameters have defaults
  - Existing code continues without modification
  - Device parameter defaults to `"desktop"`

---

## Manual Testing Checklist

### Test 1: High-Value Lead (Desktop)

**Scenario:** Customer quotes $250 polycarbonate on desktop device

**Expected Behavior:**
```
Input payload:
{
  source: "rex_chat",
  name: "John Smith",
  email: "john@example.com",
  note: "$250 Ex GST for 3mm clear polycarbonate",
  device: "desktop"
}

POST response: { ok: true }

Scoring:
  priceValue: 250
  priority: true
  routeTarget: "pipedrive"
  device: "desktop"
  utm_source: "rex_desktop"

Make.com webhook receives:
  priority: true
  routeTarget: "pipedrive"
  leadValue: "high"
  device: "desktop"
  utm_source: "rex_desktop"

Email link: 
  utm_source=rex_desktop&utm_medium=checkout_prefill&utm_campaign=rex_quote
```

**Verification Steps:**
- [ ] Check Make.com logs: see `priority: true`
- [ ] Check Pipedrive: lead appears with appropriate fields
- [ ] Open email link: verify `utm_source=rex_desktop` in URL
- [ ] Analytics: verify utm_source appears in GA dashboard

---

### Test 2: Low-Value Lead (Mobile)

**Scenario:** Customer quotes $150 acrylic on mobile device

**Expected Behavior:**
```
Input payload:
{
  source: "rex_chat",
  name: "Sarah Jones",
  email: "sarah@example.com",
  note: "[Lock it in →](https://www.plasticonline.com.au/cart/?add-to-cart=123)",
  device: "mobile"
}

Scoring:
  priceValue: 150
  priority: false
  routeTarget: "email_nurture"
  device: "mobile"
  utm_source: "rex_mobile"

Make.com webhook receives:
  priority: false
  routeTarget: "email_nurture"
  leadValue: "low"
  device: "mobile"
  utm_source: "rex_mobile"

Email link:
  utm_source=rex_mobile&utm_medium=checkout_prefill&utm_campaign=rex_quote
```

**Verification Steps:**
- [ ] Check Make.com logs: see `priority: false`
- [ ] Check Make.com logs: see `routeTarget: "email_nurture"`
- [ ] Open email link: verify `utm_source=rex_mobile` in URL
- [ ] Analytics: verify utm_source appears as `rex_mobile`

---

### Test 3: Boundary Condition ($200 Exactly)

**Scenario:** Customer quotes exactly $200

**Expected Behavior:**
```
Input: price: "$200 Ex GST"

Scoring:
  priceValue: 200
  priority: true  (>= 200)
  routeTarget: "pipedrive"
```

**Verification Steps:**
- [ ] Make.com webhook shows `priority: true`
- [ ] Lead routes to Pipedrive (not nurture)

---

### Test 4: Device Detection (User-Agent)

**Scenario:** No explicit device hint provided, rely on User-Agent

**Test Cases:**

| User-Agent | Expected | Verify |
|-----------|----------|--------|
| iPhone OS 14 | `"mobile"` | utm_source=rex_mobile |
| Android 11 | `"mobile"` | utm_source=rex_mobile |
| iPad OS | `"mobile"` | utm_source=rex_mobile |
| Windows NT 10.0; Win64; x64 | `"desktop"` | utm_source=rex_desktop |
| Macintosh; Intel Mac OS X | `"desktop"` | utm_source=rex_desktop |

**Verification Steps:**
- [ ] Test with actual mobile browser (iPhone/Android)
- [ ] Test with actual desktop browser (Chrome/Safari)
- [ ] Verify email links show correct utm_source

---

### Test 5: Device Hint Override

**Scenario:** Client provides explicit `device` hint (overrides User-Agent)

**Payload:**
```json
{
  "device": "mobile",
  "user-agent": "Mozilla/5.0 (Windows NT...)"
}
```

**Expected:** Client hint takes precedence → `"mobile"`

**Verification Steps:**
- [ ] Make.com webhook shows `device: "mobile"`
- [ ] Email links show `utm_source=rex_mobile`

---

### Test 6: Email Template Integration

**Scenario:** Verify device flows through to email URLs

**Test Case:**
1. Send quote for $250 from mobile device
2. Receive customer quote email
3. Click "Add to Cart" button in email
4. Verify destination URL contains `utm_source=rex_mobile`

**Verification Steps:**
- [ ] Email renders correctly
- [ ] All links include utm params
- [ ] utm_source matches device type
- [ ] utm_medium and utm_campaign are correct

---

### Test 7: Follow-Up Email Attribution

**Scenario:** Verify follow-up email (22hrs later) includes device attribution

**Scheduled email:**
- [ ] Renders 22 hours after initial quote
- [ ] Links include `utm_source=rex_mobile` (if mobile)
- [ ] Links include `utm_source=rex_desktop` (if desktop)

---

## Integration Testing

### Make.com Webhook Verification

**Test:** Send sample lead through POST endpoint

```bash
curl -X POST https://saabai-site.com/api/rex-leads \
  -H "Content-Type: application/json" \
  -d '{
    "source": "rex_test",
    "name": "Test User",
    "email": "test@example.com",
    "note": "$250 clear acrylic",
    "device": "desktop",
    "messages": [],
    "timestamp": "2026-04-03T20:38:00Z"
  }'
```

**Expected Response:** `{ ok: true }`

**Verification in Make.com logs:**
- [ ] Webhook triggered
- [ ] Payload includes: `priority`, `routeTarget`, `leadValue`, `device`, `utm_source`
- [ ] No errors in execution

---

### Pipedrive Integration

**Prerequisites:**
- [ ] Custom field `priority_flag` created in Pipedrive
- [ ] Make.com webhook configured to route high-priority leads

**Test Case:**
1. Submit high-value lead ($250+)
2. Monitor Make.com logs for webhook execution
3. Check Pipedrive for new deal/contact

**Verification:**
- [ ] Deal appears in Pipedrive
- [ ] `priority_flag` field populated correctly
- [ ] Deal in correct pipeline stage
- [ ] Timeline shows correct source attribution

---

### Resend Email Campaign

**Prerequisites:**
- [ ] Resend campaign ID configured in Make.com
- [ ] Low-value lead routing active

**Test Case:**
1. Submit low-value lead ($100-150)
2. Monitor Make.com logs
3. Check Resend dashboard for email send

**Verification:**
- [ ] Email sent from Resend account
- [ ] Email includes correct utm_source (rex_mobile/rex_desktop)
- [ ] Links include device attribution
- [ ] Tracking pixels fire correctly

---

### Analytics Dashboard Verification

**Setup:**
- [ ] Google Analytics configured to track utm_source
- [ ] Custom event tracking for quote submissions
- [ ] Conversion events mapped to revenue

**Test Cases:**

1. **Check utm_source dimension:**
   ```
   Dimension: utm_source
   Expected values:
     - rex_mobile
     - rex_desktop
     - rex_email (from other sources)
   ```

2. **Conversion by device:**
   ```
   Metric: Conversions
   Dimension: utm_source
   Expected: Desktop 6-10%, Mobile 3-5%
   ```

3. **Avg order value by device:**
   ```
   Metric: Revenue / Transactions
   Dimension: utm_source
   Expected: Desktop $250-400, Mobile $150-200
   ```

**Verification Steps:**
- [ ] utm_source appears as dimension in GA
- [ ] rex_mobile and rex_desktop show in segment breakdown
- [ ] Conversion funnel shows device-specific drop-off rates
- [ ] Revenue metrics segmented by device

---

## Performance Testing

### Load Testing

**Scenario:** Simulate 10 concurrent lead submissions

**Test:**
```bash
# Using Apache Bench or similar
ab -n 100 -c 10 -p payload.json \
  https://saabai-site.com/api/rex-leads
```

**Expected:**
- [ ] No timeouts
- [ ] All requests complete successfully
- [ ] Response time < 500ms (median)
- [ ] No memory leaks

**Verification:**
- [ ] Check server logs for errors
- [ ] Monitor Redis queue depth
- [ ] Verify Resend/Make.com calls complete

---

### Database/Storage Impact

**Expected Impact:**
- Redis keys added per lead:
  - Global counters: 3-5 writes
  - Daily bucket: 1 write (with expiry)
  - Material hash: 1 write
  - Recent leads list: 1 write
  - Total: ~7-8 writes per lead (fire-and-forget)

**Verification:**
- [ ] Redis memory usage stable (< 10% growth per week)
- [ ] No orphaned keys accumulating
- [ ] Key expiry working correctly (90-day window)

---

## Staging vs Production Readiness

### Pre-Production Testing

- [x] TypeScript compilation successful
- [ ] Unit tests for scoring logic (if applicable)
- [ ] Integration tests with Make.com sandbox
- [ ] Email template rendering in multiple clients
- [ ] Analytics configuration complete

### Production Readiness Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Pipedrive custom field deployed
- [ ] Make.com workflow tested end-to-end
- [ ] Analytics dashboard configured
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented
- [ ] Team trained on new scoring/routing

---

## Monitoring & Alerts

### Metrics to Monitor

1. **Lead Volume by Priority**
   - High-value (priority=true): Should be 30-40% of total
   - Low-value (priority=false): Should be 60-70% of total
   - Alert if split deviates > 10% from baseline

2. **Device Split**
   - Mobile: 50-65% of leads
   - Desktop: 35-50% of leads
   - Alert if iOS/Android traffic drops suddenly

3. **Conversion Rate**
   - High-value: Target 15-25%
   - Low-value: Target 5-8%
   - Alert if high-value drops below 12%

4. **Response Time**
   - Target median < 200ms
   - Target p95 < 500ms
   - Alert if p95 exceeds 1000ms

### Alert Thresholds

| Metric | Yellow Alert | Red Alert |
|--------|-------------|-----------|
| High-value lead arrival | 0 in 2 hours | 0 in 4 hours |
| Conversion rate (high) | < 13% | < 10% |
| Conversion rate (low) | < 4% | < 2% |
| Response time p95 | 750ms | 1500ms |
| Device detection errors | > 1% | > 5% |

---

## Known Limitations

1. **Device Detection Accuracy**
   - User-Agent spoofing: May incorrectly classify desktop as mobile
   - Older browsers: May not have reliable User-Agent string
   - Mitigation: Client-side hint takes precedence

2. **Price Parsing**
   - Non-standard formats may not parse correctly
   - Edge case: "$200-250 range" extracts $200 only
   - Mitigation: Manual entry preferred, hint system for common issues

3. **Threshold Sensitivity**
   - $200 boundary arbitrary; may shift after 30-day data analysis
   - No ML-based scoring yet (future enhancement)
   - Mitigation: Easy threshold adjustment if needed

---

## Success Criteria (30-Day Post-Launch)

**Quantitative:**
- [ ] Lead volume (monthly): 100-150 quotes
- [ ] High-value leads: 30-40% of total
- [ ] High-value conversion: 15-25%
- [ ] Low-value conversion: 5-8%
- [ ] Mobile attribution: Tracking live and accurate
- [ ] Desktop attribution: Tracking live and accurate
- [ ] Zero device detection errors

**Qualitative:**
- [ ] Sales team confirms priority lead quality
- [ ] No issues with Pipedrive integration
- [ ] Email templates render correctly (all clients)
- [ ] Team trained and using new routing
- [ ] Analytics dashboard useful for decision-making

**Team Feedback:**
- [ ] Sales team: Priority lead quality meets expectations
- [ ] Marketing team: Device insights actionable
- [ ] Ops team: Routing logic working as documented
- [ ] Analytics team: UTM tracking complete and accurate

---

## Post-Launch Review (30 Days)

### Data Analysis

Review actual performance vs. projections:

1. **Lead Quality by Source**
   - Desktop high-value conversion: Actual vs. projected (6-10% target)
   - Mobile low-value conversion: Actual vs. projected (3-5% target)

2. **Device Attribution Insights**
   - Which device drives highest revenue?
   - Which device has highest conversion rate?
   - Optimization opportunities?

3. **Pricing Sensitivity**
   - If high-value conversion below 12%, lower threshold to $180?
   - If high-value conversion above 25%, raise threshold to $250?

### Adjustment Decisions

Based on 30-day data:
- [ ] Threshold adjustment needed? (Yes/No)
- [ ] New threshold value: $______
- [ ] A/B test different thresholds?
- [ ] Implement ML-based scoring?

---

## Documentation Review

- [x] QUICK_WIN_8_9_IMPLEMENTATION.md — Comprehensive design doc
- [x] QUICK_WIN_8_9_DIFFS.md — Line-by-line code changes
- [x] QUICK_WIN_8_9_SUMMARY.txt — Quick reference guide
- [x] QUICK_WIN_8_9_VERIFICATION.md — This testing guide

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Dev Lead | | | ☐ Approved |
| QA Lead | | | ☐ Approved |
| Product | | | ☐ Approved |
| Sales Lead | | | ☐ Acknowledged |

---

**Last Updated:** April 3, 2026
**Next Review:** May 3, 2026 (30-day post-launch)
