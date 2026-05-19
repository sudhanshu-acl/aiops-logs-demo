const express = require("express");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require('@google/genai');
const {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");
require('dotenv').config();

const app = express();
const PORT = 8080;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const logFilePath = path.join(__dirname, 'logs.json');
    let existingLogs = [];
    if (fs.existsSync(logFilePath)) {
      try {
        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
        if (fileContent) {
          existingLogs = JSON.parse(fileContent);
        }
      } catch (err) {
        console.error("Error parsing existing logs.json", err);
      }
    }
    existingLogs = existingLogs.concat(parsedLogs);
    fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2));

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

app.get("/anomaly-detection", async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'logs.json');
    let recentLogs = [];
    if (fs.existsSync(logFilePath)) {
      const fileContent = fs.readFileSync(logFilePath, 'utf-8');
      if (fileContent) {
        // take the last 100 logs for analysis to avoid exceeding context window
        recentLogs = JSON.parse(fileContent).slice(-100);
      }
    }

    const prompt = `
        You are an expert software infrastructure and site reliability engineer.
        Please analyze the following application logs and generate a professional, formatted Markdown report.
        
        Focus on:
        1. Executive Summary: Overeall health and potential critical issues.
        2. Error Analysis: Highlight and explain any [ERROR] or [WARN] lines.
        3. Authentication/Access Issues: Summarize authentication attempts or failures.
        4. Recommendations: Actionable steps to fix any identified problems.
        5. Performance Check: Check lateny and performance issues.
        6. Security Check: Check security issues.
        
        Logs to analyze:
        \`\`\`
        ${JSON.stringify(recentLogs, null, 2)}
        \`\`\`
        `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    res.json({ report: response.text });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    res.status(500).json({ error: "Failed to detect anomalies" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the CloudWatch Logs API" });
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
