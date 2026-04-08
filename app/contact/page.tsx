import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function ContactPage() {
  return (
    <InfoPageLayout
      eyebrow="Contact"
      title="Need help with your store, account, or marketplace setup?"
      description="Reach out for onboarding help, billing questions, profile updates, or general support. We keep the contact page simple so mobile users can access the right next step quickly."
      heroNote="Response channels can be connected to live support later."
      stats={[
        { label: 'Help topics', value: 'Store + Support' },
        { label: 'Support type', value: 'Direct' },
        { label: 'Best for', value: 'Mobile' },
      ]}
      cards={[
        {
          title: 'General enquiries',
          description: 'For product questions, partnership discussions, and marketplace-related information.',
        },
        {
          title: 'Seller support',
          description: 'For profile setup help, dashboard questions, listings, subscriptions, and account issues.',
        },
        {
          title: 'Trust & safety',
          description: 'For report requests, privacy concerns, suspicious activity, or account verification follow-up.',
        },
      ]}
      sections={[
        {
          title: 'Preferred contact channels',
          bullets: [
            'Email: support@cateloge.com',
            'Seller onboarding: onboarding@cateloge.com',
            'Partnerships: growth@cateloge.com',
          ],
        },
        {
          title: 'Before you contact us',
          bullets: [
            'Keep your store URL or username ready so the team can verify the correct account.',
            'Mention the issue clearly and include screenshots if the problem is visual or device-specific.',
            'For billing or plan issues, share the subscription name and the date of payment if available.',
          ],
        },
      ]}
      ctaTitle="Need immediate self-serve help?"
      ctaDescription="Check the help center first for setup, account, and policy guidance."
      ctaHref="/help-center"
      ctaLabel="Open Help Center"
    />
  );
}
