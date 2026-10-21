import { useCallback, useState, useRef } from 'react';
import { api } from './api';
import { asEpoch } from './format';

const EMPTY_STATS = {
  total_checks: 0,
  successful_checks: 0,
  failed_checks: 0,
  uptime_percentage: null,
  average_response_time_ms: null,
};

async function mapWithLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function normalizeCheck(record, fallbackTargetId) {
  if (!record || typeof record !== 'object') return null;
  return {
    ...record,
    target_id: Number(record.target_id ?? fallbackTargetId),
    status_code: record.status_code === null || record.status_code === undefined ? null : Number(record.status_code),
    response_time_ms: Number(record.response_time_ms),
    is_healthy: typeof record.is_healthy === 'boolean' ? record.is_healthy : null,
    checked_at: record.checked_at || null,
  };
}

function sumStats(targets) {
  const totalChecks = targets.reduce((sum, target) => sum + (Number(target.stats?.total_checks) || 0), 0);
  const successfulChecks = targets.reduce((sum, target) => sum + (Number(target.stats?.successful_checks) || 0), 0);
  const failedChecks = targets.reduce((sum, target) => sum + (Number(target.stats?.failed_checks) || 0), 0);
  const weightedResponse = targets.reduce((sum, target) => {
    const count = Number(target.stats?.total_checks) || 0;
    const average = Number(target.stats?.average_response_time_ms);
    return sum + (count > 0 && Number.isFinite(average) ? average * count : 0);
  }, 0);

  return {
    total_checks: totalChecks,
    successful_checks: successfulChecks,
    failed_checks: failedChecks,
    uptime_percentage: totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : null,
    average_response_time_ms: totalChecks > 0 ? weightedResponse / totalChecks : null,
  };
}

export function useDashboardData() {
  const [data, setData] = useState({
    targets: [],
    history: [],
    summary: EMPTY_STATS,
    loading: true,
    refreshing: false,
    error: null,
    partialErrors: [],
    updatedAt: null,
  });
  const hasLoaded = useRef(false);
  const manualChecks = useRef(new Map());
  const requestSequence = useRef(0);

  const reset = useCallback(() => {
    requestSequence.current += 1;
    hasLoaded.current = false;
    manualChecks.current.clear();
    setData({
      targets: [],
      history: [],
      summary: EMPTY_STATS,
      loading: true,
      refreshing: false,
      error: null,
      partialErrors: [],
      updatedAt: null,
    });
  }, []);

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const initial = !hasLoaded.current;
    setData((current) => ({
      ...current,
      loading: initial,
      refreshing: !initial,
      error: null,
    }));

    try {
      const targetsPayload = await api.getTargets();
      if (!Array.isArray(targetsPayload)) {
        throw new Error('The targets endpoint did not return a list.');
      }

      const partialErrors = [];
      const targets = await mapWithLimit(targetsPayload, 4, async (target) => {
        const [statsResult, historyResult] = await Promise.allSettled([
          api.getTargetStats(target.id),
          api.getTargetHistory(target.id),
        ]);

        let stats = null;
        if (statsResult.status === 'fulfilled' && statsResult.value && typeof statsResult.value === 'object') {
          stats = {
            ...EMPTY_STATS,
            ...statsResult.value,
            total_checks: Number(statsResult.value.total_checks) || 0,
            successful_checks: Number(statsResult.value.successful_checks) || 0,
            failed_checks: Number(statsResult.value.failed_checks) || 0,
            uptime_percentage: Number.isFinite(Number(statsResult.value.uptime_percentage)) ? Number(statsResult.value.uptime_percentage) : null,
            average_response_time_ms: Number.isFinite(Number(statsResult.value.average_response_time_ms)) ? Number(statsResult.value.average_response_time_ms) : null,
          };
        } else {
          partialErrors.push(`${target.name}: statistics unavailable`);
        }

        let rawHistory = [];
        if (historyResult.status === 'fulfilled') {
          const payload = historyResult.value;
          rawHistory = Array.isArray(payload?.history) ? payload.history : Array.isArray(payload) ? payload : [];
        } else {
          partialErrors.push(`${target.name}: check history unavailable`);
        }

        // Avoid attributing another target's row if the backend's history filter returns it.
        const history = rawHistory
          .filter((record) => record && Number(record.target_id) === Number(target.id))
          .map((record) => normalizeCheck(record, target.id))
          .filter(Boolean);

        const remembered = manualChecks.current.get(String(target.id));
        if (remembered && !history.some((record) => String(record.id ?? record.check_id) === String(remembered.id))) {
          history.push(remembered);
        }
        history.sort((a, b) => asEpoch(b.checked_at) - asEpoch(a.checked_at));

        return {
          ...target,
          stats,
          history,
          latestCheck: history[0] || null,
        };
      });

      const history = targets.flatMap((target) => target.history.map((record) => ({
        ...record,
        target_name: target.name,
        target_url: target.url,
      })));
      history.sort((a, b) => asEpoch(b.checked_at) - asEpoch(a.checked_at));

      if (sequence === requestSequence.current) {
        hasLoaded.current = true;
        setData({
          targets,
          history,
          summary: sumStats(targets),
          loading: false,
          refreshing: false,
          error: null,
          partialErrors,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      if (sequence === requestSequence.current) {
        hasLoaded.current = true;
        setData((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: error.message || 'Could not load monitoring data.',
        }));
      }
    }
  }, []);

  const rememberManualCheck = useCallback((result) => {
    if (!result || result.target_id === undefined) return;
    const check = normalizeCheck({
      ...result,
      id: result.check_id,
    }, result.target_id);
    if (check) manualChecks.current.set(String(result.target_id), check);
  }, []);

  return { ...data, refresh, reset, rememberManualCheck };
}
