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
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  apiKey: string;
}

export const WelcomeEmail = ({ name, apiKey }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to SendComms - Your API is ready!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://sendcomms.com/logo.png"
          width="150"
          height="50"
          alt="SendComms"
          style={logo}
        />
        
        <Heading style={h1}>Welcome to SendComms!</Heading>
        
        <Text style={text}>
          Hi {name},
        </Text>
        
        <Text style={text}>
          Thank you for signing up! Your account is now active and ready to use.
          Here&apos;s your API key:
        </Text>
        
        <Section style={codeBox}>
          <Text style={code}>{apiKey}</Text>
        </Section>
        
        <Text style={textSmall}>
          ⚠️ Keep this key secure. Don&apos;t share it publicly or commit it to version control.
        </Text>
        
        <Text style={text}>
          Get started by reading our documentation:
        </Text>
        
        <Button
          style={button}
          href="https://docs.sendcomms.com/quickstart"
        >
          View Quickstart Guide
        </Button>
        
        <Section style={features}>
          <Heading as="h2" style={h2}>What you can do:</Heading>
          <Text style={featureItem}>📱 Send SMS across 180+ countries</Text>
          <Text style={featureItem}>📧 Send transactional & marketing emails</Text>
          <Text style={featureItem}>📞 Purchase airtime for any carrier</Text>
          <Text style={featureItem}>📶 Buy mobile data bundles</Text>
        </Section>
        
        <Text style={text}>
          Need help? Reply to this email or visit our{' '}
          <Link href="https://sendcomms.com/support" style={link}>
            support center
          </Link>
          .
        </Text>
        
        <Text style={text}>
          Happy building!
          <br />
          The SendComms Team
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

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const logo = {
  margin: '0 auto 20px',
  display: 'block' as const,
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  margin: '30px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: '0 0 16px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const textSmall = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0 24px',
};

const codeBox = {
  background: '#f4f4f5',
  borderRadius: '8px',
  margin: '16px 0',
  padding: '16px',
  border: '1px solid #e4e4e7',
};

const code = {
  color: '#0066cc',
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  wordBreak: 'break-all' as const,
  margin: 0,
};

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px 0',
};

const features = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const featureItem = {
  color: '#4a4a4a',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const link = {
  color: '#0066cc',
  textDecoration: 'underline',
};

const footer = {
  borderTop: '1px solid #e4e4e7',
  marginTop: '32px',
  paddingTop: '24px',
};

const footerText = {
  color: '#999',
  fontSize: '12px',
  textAlign: 'center' as const,
};

export default WelcomeEmail;
