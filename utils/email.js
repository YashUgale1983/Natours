// email.js helps implement a complex email handler

const pug = require("pug");
const nodemailer = require("nodemailer");
const { convert } = require("html-to-text");
const Transport = require("nodemailer-brevo-transport");

// here, we create a class to make send different types of emails
module.exports = class Email {
  constructor(user, url) {
    (this.to = user.email),
      (this.firstName = user.name.split(" ")[0]),
      (this.url = url),
      (this.from = `Yash Ugale <${process.env.EMAIL_FROM}>`);
  }

  newTransport() {
    // if we are in production, send real emails
    if (process.env.NODE_ENV === "production") {
      // implementation for real emails here.
      return nodemailer.createTransport(
        new Transport({ apiKey: process.env.SENDINBLUE_API_KEY })
      );
    }
    // if we are in develop, send mails using mailtrap

    // here we return the transporter
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // this is to actually send the mail
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    // 3) Create a transport and send the mail
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to Natours family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Password reset link (Valid for only 10 minutes.)"
    );
  }

  async sendOTP() {
    await this.send(
      "sendOTP",
      "One Time Password for creating account (Valid for only 15 minutes.)"
    );
  }
};
