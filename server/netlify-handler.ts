import { Handler } from '@netlify/functions';
import express from 'express';
import { registerRoutes } from './routes.js';

// Create Express app
const app = express();

// Register routes
registerRoutes(app);

// Convert Express app to Netlify function
const handler: Handler = async (event, context) => {
  const { httpMethod, path, headers, body, queryStringParameters } = event;
  
  // Create a mock request/response for Express
  const req = {
    method: httpMethod,
    url: path,
    headers: headers || {},
    body: body ? JSON.parse(body) : {},
    query: queryStringParameters || {},
    params: {}
  } as any;

  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.headers['Content-Type'] = 'application/json';
      this.body = JSON.stringify(data);
      return this;
    },
    send: function(data: any) {
      this.body = typeof data === 'string' ? data : JSON.stringify(data);
      return this;
    },
    setHeader: function(name: string, value: string) {
      this.headers[name] = value;
      return this;
    }
  } as any;

  // Handle the request
  try {
    // Find matching route and execute
    await new Promise((resolve, reject) => {
      app._router.handle(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

    return {
      statusCode: res.statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        ...res.headers
      },
      body: res.body
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler };