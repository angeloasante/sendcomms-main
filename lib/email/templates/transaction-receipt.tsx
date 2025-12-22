import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TransactionReceiptProps {
  customerName: string;
  transactionId: string;
  type: 'email' | 'sms' | 'airtime' | 'data';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: 'success' | 'failed' | 'pending';
}

export const TransactionReceipt = ({
  customerName,
  transactionId,
  type,
  amount,
  currency,
  description,
  date,
  status
}: TransactionReceiptProps) => {
  const statusColors = {
    success: '#10b981',
    failed: '#ef4444',
    pending: '#f59e0b'
  };

  const typeIcons = {
    email: '📧',
    sms: '📱',
    airtime: '📞',
    data: '📶'
  };

  return (
    <Html>
      <Head />
      <Preview>Transaction Receipt - {transactionId}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Transaction Receipt</Heading>
          
          <Text style={text}>
            Hi {customerName},
          </Text>
          
          <Text style={text}>
            Here&apos;s your transaction receipt:
          </Text>
          
          <Section style={receiptBox}>
            <div style={receiptHeader}>
              <Text style={receiptIcon}>{typeIcons[type]}</Text>
              <Text style={receiptType}>{type.toUpperCase()}</Text>
            </div>
            
            <div style={receiptRow}>
              <Text style={receiptLabel}>Transaction ID</Text>
              <Text style={receiptValue}>{transactionId}</Text>
            </div>
            
            <div style={receiptRow}>
              <Text style={receiptLabel}>Description</Text>
              <Text style={receiptValue}>{description}</Text>
            </div>
            
            <div style={receiptRow}>
              <Text style={receiptLabel}>Date</Text>
              <Text style={receiptValue}>{date}</Text>
            </div>
            
            <div style={receiptRow}>
              <Text style={receiptLabel}>Status</Text>
              <Text style={{ ...receiptValue, color: statusColors[status] }}>
                {status.toUpperCase()}
              </Text>
            </div>
            
            <div style={receiptTotal}>
              <Text style={receiptTotalLabel}>Total</Text>
              <Text style={receiptTotalValue}>
                {currency} {amount.toFixed(4)}
              </Text>
            </div>
          </Section>
          
          <Text style={textSmall}>
            This receipt was automatically generated. For questions, contact support@sendcomms.com
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
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '500px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const textSmall = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '24px 0 0',
  textAlign: 'center' as const,
};

const receiptBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
};

const receiptHeader = {
  textAlign: 'center' as const,
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e2e8f0',
};

const receiptIcon = {
  fontSize: '32px',
  margin: '0 0 8px',
};

const receiptType = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#666',
  margin: 0,
};

const receiptRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #e2e8f0',
};

const receiptLabel = {
  color: '#666',
  fontSize: '14px',
  margin: 0,
};

const receiptValue = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: 0,
  textAlign: 'right' as const,
};

const receiptTotal = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '16px 0 0',
  marginTop: '8px',
};

const receiptTotalLabel = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  margin: 0,
};

const receiptTotalValue = {
  color: '#0066cc',
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: 0,
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
  margin: 0,
};

export default TransactionReceipt;
