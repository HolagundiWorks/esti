import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { connect as tcpConnect, type Socket } from "node:net";

type SmtpSocket = Socket | TLSSocket;

function parseCode(line: string): number {
  return parseInt(line.slice(0, 3), 10);
}

async function readSmtpResponse(socket: SmtpSocket): Promise<string> {
  let buffer = "";

  while (true) {
    const chunk = await new Promise<Buffer>((resolve, reject) => {
      socket.once("data", resolve);
      socket.once("error", reject);
    });
    buffer += chunk.toString("utf8");

    const lines = buffer.split("\r\n").filter((l) => l.length > 0);
    const last = lines.at(-1);
    if (!last) continue;

    if (last.length >= 4 && last[3] === " ") {
      return buffer.trim();
    }
  }
}

async function smtpCommand(socket: SmtpSocket, command?: string): Promise<string> {
  if (command) {
    socket.write(`${command}\r\n`);
  }
  const response = await readSmtpResponse(socket);
  const lastLine = response.split("\r\n").at(-1) ?? response;
  const code = parseCode(lastLine);
  if (code >= 400) {
    throw new Error(`SMTP command failed (${code}): ${response}`);
  }
  return response;
}

function base64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function extractAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match?.[1] ?? from.trim();
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

async function connectSocket(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
  const socket: SmtpSocket = secure
    ? tlsConnect({ host, port, servername: host })
    : tcpConnect({ host, port });

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      socket.off("error", reject);
      resolve();
    };
    if (secure) {
      (socket as TLSSocket).once("secureConnect", onReady);
    } else {
      (socket as Socket).once("connect", onReady);
    }
    socket.once("error", reject);
  });

  return socket;
}

async function authAndSend(
  socket: SmtpSocket,
  input: {
    host: string;
    user: string;
    pass: string;
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
  },
): Promise<void> {
  await smtpCommand(socket, "AUTH LOGIN");
  await smtpCommand(socket, base64(input.user));
  await smtpCommand(socket, base64(input.pass));
  await smtpCommand(socket, `MAIL FROM:<${extractAddress(input.from)}>`);
  await smtpCommand(socket, `RCPT TO:<${input.to}>`);

  const body = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : null,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    input.text,
  ]
    .filter(Boolean)
    .join("\r\n");

  await smtpCommand(socket, "DATA");
  socket.write(`${body.replace(/\n/g, "\r\n")}\r\n.\r\n`);
  const dataResponse = await readSmtpResponse(socket);
  const code = parseCode(dataResponse.split("\r\n").at(-1) ?? dataResponse);
  if (code >= 400) {
    throw new Error(`SMTP DATA failed (${code}): ${dataResponse}`);
  }
  await smtpCommand(socket, "QUIT");
}

export async function sendSmtpMessage(input: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  let socket = await connectSocket(input.host, input.port, input.secure);

  try {
    await smtpCommand(socket);
    const ehlo = await smtpCommand(socket, `EHLO ${input.host}`);

    if (!input.secure && ehlo.toUpperCase().includes("STARTTLS")) {
      await smtpCommand(socket, "STARTTLS");
      const upgraded = tlsConnect({
        socket: socket as Socket,
        servername: input.host,
      });
      await new Promise<void>((resolve, reject) => {
        upgraded.once("secureConnect", () => resolve());
        upgraded.once("error", reject);
      });
      socket = upgraded;
      await smtpCommand(socket, `EHLO ${input.host}`);
    }

    await authAndSend(socket, { ...input, host: input.host });
  } finally {
    socket.end();
  }
}
