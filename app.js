const express = require("express");
const path = require("path");
const {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");
require('dotenv').config();

const app = express();
const PORT = 8080;

// Utility function to parse log messages
function parseLogs(logs) {
  const logRegex = /^(\S+) - - \[(.*?)\] "(\S+) (.*?) (\S+)" (\d{3}) (\d+) "(.*?)" "(.*?)"$/;

  return logs.map(log => {
    let message = log.message;
    let metadata = {};

    // Try to parse nested JSON structure
    try {
      const parsedMessage = JSON.parse(message);
      message = parsedMessage.log || message;
      metadata = {
        hostname: parsedMessage.hostname,
        environment: parsedMessage.environment,
        az: parsedMessage.az,
        ec2_instance_id: parsedMessage.ec2_instance_id
      };
    } catch (jsonError) {
      // Fallback to raw message if not JSON
    }

    const match = message.match(logRegex);

    if (!match) {
      return {
        error: "Invalid log format",
        raw: log,
        parsedMessage: message
      };
    }

    const parsedLog = {
      ip: match[1],
      timestamp: match[2],
      method: match[3],
      endpoint: match[4],
      protocol: match[5],
      statusCode: parseInt(match[6]),
      responseSize: parseInt(match[7]),
      referrer: match[8],
      userAgent: match[9],
      ...metadata,
      ingestionTime: new Date(log.ingestionTime).toISOString()
    };

    return parsedLog;
  });
}

// AWS CloudWatch Logs client setup
const client = new CloudWatchLogsClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// GET logs endpoint
app.get("/logs", async (req, res) => {

  const { logGroupName, logStreamName } = req.query;
  // const limit = Math.min(Math.max(parseInt(limitStr) || 50, 1), 10000);

  if (!logGroupName || !logStreamName) {
    return res.status(400).json({
      error: "logGroupName and logStreamName are required",
    });
  }

  try {
    const command = new GetLogEventsCommand({
      logGroupName,
      logStreamName,
      startFromHead: false,
      limit: 100,
    });

    const response = await client.send(command);

    console.log("LOGS GROUP", logGroupName);

    // parse logs using helper function
    const parsedLogs = parseLogs(response.events);

    res.json({
      events: parsedLogs,
      nextForwardToken: response.nextForwardToken,
      nextBackwardToken: response.nextBackwardToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// List CloudWatch log streams
app.get("/log-streams", async (req, res) => {
  const { logGroupName } = req.query;
  if (!logGroupName) return res.status(400).json({ error: "logGroupName required" });

  try {
    const command = new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
      limit: 50,
    });
    const response = await client.send(command);
    res.json(response.logStreams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch log streams" });
  }
});


app.get("/", (req, res) => {
  res.json({ message: "Welcome to the CloudWatch Logs API" });
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
