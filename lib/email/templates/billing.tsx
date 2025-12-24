import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

// ================================
// PAYMENT SUCCESSFUL EMAIL
// ================================
interface PaymentSuccessProps {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  invoiceUrl?: string;
}

export const PaymentSuccessEmail = ({
  name,
  planName,
  amount,
  currency,
  invoiceNumber,
  periodStart,
  periodEnd,
  invoiceUrl,
}: PaymentSuccessProps) => (
  <Html>
    <Head />
    <Preview>Payment successful - Your {planName} subscription is active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="50"
          alt="SendComms"
          style={logo}
        />
        
        <Section style={successBanner}>
          <Text style={successIcon}>✓</Text>
          <Heading style={h1Success}>Payment Successful!</Heading>
        </Section>
        
        <Text style={text}>Hi {name},</Text>
        
        <Text style={text}>
          Your payment of <strong>{currency} {amount.toFixed(2)}</strong> for {planName} has been processed successfully.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsTitle}>Payment Details</Text>
          <Hr style={hr} />
          <Text style={detailItem}>
            <strong>Invoice:</strong> {invoiceNumber}
          </Text>
          <Text style={detailItem}>
            <strong>Plan:</strong> {planName}
          </Text>
          <Text style={detailItem}>
            <strong>Amount:</strong> {currency} {amount.toFixed(2)}
          </Text>
          <Text style={detailItem}>
            <strong>Billing Period:</strong> {periodStart} - {periodEnd}
          </Text>
        </Section>
        
        {invoiceUrl && (
          <Button style={button} href={invoiceUrl}>
            View Invoice
          </Button>
        )}
        
        <Text style={text}>
          Your usage limits have been reset for the new billing period. 
          Check your <Link href="https://sendcomms.com/dashboard/billing" style={link}>billing dashboard</Link> for details.
        </Text>
        
        <Text style={text}>
          Thank you for being a SendComms customer!
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
            <br />
            <Link href="https://sendcomms.com/dashboard/billing" style={footerLink}>Manage Billing</Link>
            {' | '}
            <Link href="https://sendcomms.com/support" style={footerLink}>Help Center</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// PAYMENT FAILED EMAIL
// ================================
interface PaymentFailedProps {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryDate?: string;
  errorMessage?: string;
  updatePaymentUrl: string;
}

export const PaymentFailedEmail = ({
  name,
  planName,
  amount,
  currency,
  attemptCount,
  maxAttempts,
  nextRetryDate,
  errorMessage,
  updatePaymentUrl,
}: PaymentFailedProps) => (
  <Html>
    <Head />
    <Preview>Action required: Payment failed for your {planName} subscription</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="50"
          alt="SendComms"
          style={logo}
        />
        
        <Section style={warningBanner}>
          <Text style={warningIcon}>⚠️</Text>
          <Heading style={h1Warning}>Payment Failed</Heading>
        </Section>
        
        <Text style={text}>Hi {name},</Text>
        
        <Text style={text}>
          We were unable to process your payment of <strong>{currency} {amount.toFixed(2)}</strong> for your {planName} subscription.
        </Text>
        
        {errorMessage && (
          <Section style={errorBox}>
            <Text style={errorText}>
              <strong>Reason:</strong> {errorMessage}
            </Text>
          </Section>
        )}
        
        <Section style={detailsBox}>
          <Text style={detailsTitle}>What happens next?</Text>
          <Hr style={hr} />
          <Text style={detailItem}>
            • Attempt {attemptCount} of {maxAttempts} failed
          </Text>
          {nextRetryDate && (
            <Text style={detailItem}>
              • We&apos;ll retry your payment on <strong>{nextRetryDate}</strong>
            </Text>
          )}
          <Text style={detailItem}>
            • Your subscription remains active, but please update your payment method
          </Text>
        </Section>
        
        <Button style={buttonWarning} href={updatePaymentUrl}>
          Update Payment Method
        </Button>
        
        <Text style={text}>
          If you don&apos;t update your payment method, your subscription may be cancelled after {maxAttempts} failed attempts.
        </Text>
        
        <Text style={textSmall}>
          Need help? Contact our <Link href="https://sendcomms.com/support" style={link}>support team</Link>.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// SUBSCRIPTION CANCELLED EMAIL
// ================================
interface SubscriptionCancelledProps {
  name: string;
  planName: string;
  reason: 'user_cancelled' | 'payment_failed' | 'other';
  accessEndDate: string;
  resubscribeUrl: string;
}

export const SubscriptionCancelledEmail = ({
  name,
  planName,
  reason,
  accessEndDate,
  resubscribeUrl,
}: SubscriptionCancelledProps) => (
  <Html>
    <Head />
    <Preview>Your {planName} subscription has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="100"
          alt="SendComms"
          style={logo}
        />
        
        <Heading style={h1}>Subscription Cancelled</Heading>
        
        <Text style={text}>Hi {name},</Text>
        
        {reason === 'user_cancelled' ? (
          <Text style={text}>
            Your {planName} subscription has been cancelled as requested. 
            We&apos;re sorry to see you go!
          </Text>
        ) : reason === 'payment_failed' ? (
          <Text style={text}>
            Your {planName} subscription has been cancelled due to failed payment attempts. 
            We tried multiple times but couldn&apos;t process your payment.
          </Text>
        ) : (
          <Text style={text}>
            Your {planName} subscription has been cancelled.
          </Text>
        )}
        
        <Section style={detailsBox}>
          <Text style={detailsTitle}>What you need to know</Text>
          <Hr style={hr} />
          <Text style={detailItem}>
            • You&apos;ll have access until: <strong>{accessEndDate}</strong>
          </Text>
          <Text style={detailItem}>
            • After this date, you&apos;ll be moved to our Free plan
          </Text>
          <Text style={detailItem}>
            • Your data will be preserved
          </Text>
        </Section>
        
        <Text style={text}>
          Changed your mind? You can resubscribe anytime:
        </Text>
        
        <Button style={button} href={resubscribeUrl}>
          Resubscribe
        </Button>
        
        <Text style={textSmall}>
          We&apos;d love to hear your feedback! Reply to this email to let us know how we can improve.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// UPCOMING PAYMENT REMINDER
// ================================
interface UpcomingPaymentProps {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  billingUrl: string;
}

export const UpcomingPaymentEmail = ({
  name,
  planName,
  amount,
  currency,
  paymentDate,
  billingUrl,
}: UpcomingPaymentProps) => (
  <Html>
    <Head />
    <Preview>Upcoming payment: {currency} {amount.toFixed(2)} on {paymentDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="100"
          alt="SendComms"
          style={logo}
        />
        
        <Section style={infoBanner}>
          <Text style={infoIcon}>📅</Text>
          <Heading style={h1Info}>Upcoming Payment</Heading>
        </Section>
        
        <Text style={text}>Hi {name},</Text>
        
        <Text style={text}>
          This is a friendly reminder that your {planName} subscription will renew soon.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsTitle}>Payment Details</Text>
          <Hr style={hr} />
          <Text style={detailItem}>
            <strong>Plan:</strong> {planName}
          </Text>
          <Text style={detailItem}>
            <strong>Amount:</strong> {currency} {amount.toFixed(2)}
          </Text>
          <Text style={detailItem}>
            <strong>Payment Date:</strong> {paymentDate}
          </Text>
        </Section>
        
        <Text style={text}>
          No action is needed if you want to continue your subscription. 
          We&apos;ll automatically charge your payment method on file.
        </Text>
        
        <Button style={button} href={billingUrl}>
          Manage Subscription
        </Button>
        
        <Text style={textSmall}>
          Want to cancel? You can do so anytime from your billing dashboard before the payment date.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// TRIAL ENDING SOON EMAIL
// ================================
interface TrialEndingProps {
  name: string;
  planName: string;
  trialEndDate: string;
  amount: number;
  currency: string;
  upgradeUrl: string;
}

export const TrialEndingEmail = ({
  name,
  planName,
  trialEndDate,
  amount,
  currency,
  upgradeUrl,
}: TrialEndingProps) => (
  <Html>
    <Head />
    <Preview>Your trial ends on {trialEndDate} - Upgrade now to keep your features</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="100"
          alt="SendComms"
          style={logo}
        />
        
        <Section style={infoBanner}>
          <Text style={infoIcon}>⏰</Text>
          <Heading style={h1Info}>Your Trial is Ending Soon</Heading>
        </Section>
        
        <Text style={text}>Hi {name},</Text>
        
        <Text style={text}>
          Your free trial of {planName} ends on <strong>{trialEndDate}</strong>.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailsTitle}>Don&apos;t lose access to:</Text>
          <Hr style={hr} />
          <Text style={detailItem}>✓ Higher SMS & Email limits</Text>
          <Text style={detailItem}>✓ Priority support</Text>
          <Text style={detailItem}>✓ Advanced analytics</Text>
          <Text style={detailItem}>✓ Custom branding</Text>
        </Section>
        
        <Text style={text}>
          Upgrade now for just <strong>{currency} {amount.toFixed(2)}/month</strong> and keep all your premium features.
        </Text>
        
        <Button style={button} href={upgradeUrl}>
          Upgrade Now
        </Button>
        
        <Text style={textSmall}>
          If you don&apos;t upgrade, you&apos;ll be moved to our Free plan on {trialEndDate}.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// PAYMENT ACTION REQUIRED EMAIL
// ================================
interface PaymentActionRequiredProps {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  actionUrl: string;
}

export const PaymentActionRequiredEmail = ({
  name,
  planName,
  amount,
  currency,
  actionUrl,
}: PaymentActionRequiredProps) => (
  <Html>
    <Head />
    <Preview>Action required to complete your payment</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="100"
          alt="SendComms"
          style={logo}
        />
        
        <Section style={warningBanner}>
          <Text style={warningIcon}>🔐</Text>
          <Heading style={h1Warning}>Action Required</Heading>
        </Section>
        
        <Text style={text}>Hi {name},</Text>
        
        <Text style={text}>
          Your bank requires additional verification to process your payment of <strong>{currency} {amount.toFixed(2)}</strong> for {planName}.
        </Text>
        
        <Text style={text}>
          This is usually a one-time security check (3D Secure) to protect your account.
        </Text>
        
        <Button style={buttonWarning} href={actionUrl}>
          Complete Payment
        </Button>
        
        <Text style={textSmall}>
          Please complete this within 24 hours to avoid service interruption.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 SendComms. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// ================================
// STYLES
// ================================
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const logo = {
  margin: '0 auto 20px',
  display: 'block' as const,
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const h1Success = {
  ...h1,
  color: '#059669',
};

const h1Warning = {
  ...h1,
  color: '#d97706',
};

const h1Info = {
  ...h1,
  color: '#2563eb',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const textSmall = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  margin: '24px auto',
};

const buttonWarning = {
  ...button,
  backgroundColor: '#d97706',
};

const successBanner = {
  backgroundColor: '#d1fae5',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const successIcon = {
  fontSize: '40px',
  margin: '0 0 10px',
};

const warningBanner = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const warningIcon = {
  fontSize: '40px',
  margin: '0 0 10px',
};

const infoBanner = {
  backgroundColor: '#dbeafe',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const infoIcon = {
  fontSize: '40px',
  margin: '0 0 10px',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const detailsTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
};

const errorBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  padding: '12px 16px',
  margin: '16px 0',
};

const errorText = {
  color: '#dc2626',
  fontSize: '14px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
};

const footer = {
  marginTop: '40px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
};

const footerLink = {
  color: '#9ca3af',
  textDecoration: 'underline',
};

export default {
  PaymentSuccessEmail,
  PaymentFailedEmail,
  SubscriptionCancelledEmail,
  UpcomingPaymentEmail,
  TrialEndingEmail,
  PaymentActionRequiredEmail,
};
