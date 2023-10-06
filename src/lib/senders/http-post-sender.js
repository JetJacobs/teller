import axios from 'axios';
import axiosRetry from 'axios-retry';

axiosRetry(axios, {
  retries: 15,
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition: () => true,
});

function createSenderStrategy() {
  return {
    send: (hook, eventType, data) => {
      throw new Error('send method must be implemented.');
    },
  };
}

export function createHttpPostSender(buildHeaders, orgName) {
  return {
    ...createSenderStrategy(),
    send: async (hook, eventType, data) => {
      const url = `${hook?.url?.base}${hook?.url?.relativeUri}`;
      const jsonBody = {
        event: eventType,
        webhookId: hook.id,
        data,
      };
      const rawBody = JSON.stringify(jsonBody);
      const options = {
        method: 'POST',
        url,
        headers: buildHeaders(
          orgName,
          url,
          rawBody,
          Date.now(),
          hook?.signatureToken,
        ),
        body: rawBody,
      };

      // eslint-disable-next-line no-undef
      return axios.request(options);
    },
  };
}

export default createHttpPostSender;
