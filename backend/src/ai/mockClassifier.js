// Keyword-based classification simulating Claude AI.
// Used as the default local testing engine or fallback when CLAUDE_API_KEY is not defined.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockClassifier = async (messageContent) => {
  // Simulate network/processing latency of 500ms
  await sleep(500);

  const text = messageContent.toLowerCase();

  let category = 'other';
  let priority = 'MEDIUM';
  let reason = 'Request does not trigger any specific category keywords. Defaulted to standard processing.';
  let confidence = 0.75;
  let summary = 'General customer inquiry or miscellaneous message.';

  if (/payment|billing|charge|invoice|refund/i.test(text)) {
    category = 'support';
    priority = 'HIGH';
    reason = 'Identified billing/payment keywords. Set to HIGH priority support processing.';
    confidence = 0.92;
    summary = 'Inquiry regarding billing, payments, or transaction charges.';
  } else if (/urgent|asap|emergency|broken|error|down|crash/i.test(text)) {
    category = 'urgent';
    priority = 'HIGH';
    reason = 'High importance operational keywords detected. Routed to high-priority triage.';
    confidence = 0.95;
    summary = 'Critical system incident or urgent help request.';
  } else if (/buy|pricing|demo|trial|quote|sales|discount|upgrade/i.test(text)) {
    category = 'sales';
    priority = 'MEDIUM';
    reason = 'Commercial intent terms matching sales pipeline category rules.';
    confidence = 0.88;
    summary = 'Product interest, pricing details, or sales demonstration request.';
  } else if (/http|click here|win|prize|free cash|viagra|bitcoin|casino/i.test(text)) {
    category = 'spam';
    priority = 'LOW';
    reason = 'Contains spam indicators, unsolicited promotional links, or sweepstakes terms.';
    confidence = 0.98;
    summary = 'Potential advertising spam or unsolicited link execution request.';
  }

  // Create a customized one-sentence summary of the message content
  if (messageContent.length > 50) {
    summary = messageContent.substring(0, 75).trim() + '...';
  } else {
    summary = messageContent;
  }

  return {
    category,
    priority,
    summary,
    confidence,
    reason
  };
};
