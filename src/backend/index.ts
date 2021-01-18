import axios, { AxiosError, AxiosResponse } from 'axios';
import { config } from 'dotenv';
import express, { RequestHandler } from 'express';
import { Base64 } from 'js-base64';
import cors from 'cors'
config();
const { PUSH_API_USERNAME: username, PUSH_API_MASTER_KEY: password, PUSH_API_ENDPOINT: endpoint } = process.env;

const getAirshipHeaders = () => {
  return {
    Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
    Accept: 'application/vnd.urbanairship+json; version=3',
  };
};

const fetchAirship = (
  instance = axios.create({
    baseURL: endpoint,
    timeout: 60000,
    headers: getAirshipHeaders(),
  })
) => {
  instance.interceptors.response.use(
    // Could add more extensive logging for airship here
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );
  return instance;
};

const app = express();
app.use(cors());
app.use(express.json());

const port = 4444;
const host = 'localhost';

const router = express.Router();

const indexData: RequestHandler = async (req, res) => {
  try {
    const { data, status } = await fetchAirship().get('/api/templates', {
      params: {
        // if we ever have more then 100 templates,
        // we'll need to check if there is a next page and iterate
        page_size: 100,
      },
    });
    if (status !== 200 || !data.ok) {
      const error = data?.error ?? { error: 'dunno wtf happened lol...' };
      return res.status(status).json(error);
    } else {
      const { templates } = data;
      return res.status(200).json(templates);
    }
  } catch (error) {
    // const response = error?.response;
    return res.status(500);
  }
};

const indexPost: RequestHandler<any, any, { templateId: string, variables: any, channels: any }> = async (req, res) => {
  try {
    const { templateId, variables, channels } = req.body;
    const result = await fetchAirship().post('/api/templates/push', {
      device_types: [ "android" ],
      template: templateId,
      audience: {
        android_channel: channels.android_channel
      },
      merge_data: {
        template_id: templateId,
        substitutions: variables
      }
    })

    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({
      error
    })
  }
}

const sendNotification = router.post('/', indexPost)
const index = router.get('/', indexData);

app.use(index);
app.use(sendNotification);
app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Airship started on ${host}:${port}`);
});
