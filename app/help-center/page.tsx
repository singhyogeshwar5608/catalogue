import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function HelpCenterPage() {
  return (
    <InfoPageLayout
      eyebrow="Help Center"
      title="Quick answers for sellers and shoppers."
      description="The help center is organized to reduce support friction on mobile. Start with setup, account access, plans, or storefront visibility depending on your issue."
      heroNote="Structured to be easy to scan on smaller screens."
      stats={[
        { label: 'Setup', value: 'Fast' },
        { label: 'Billing', value: 'Guided' },
        { label: 'Support', value: 'Available' },
      ]}
      cards={[
        {
          title: 'Create and manage your store',
          description:
            'Learn how to set up store details, update branding, publish products, and keep your catalog accurate.',
        },
        {
          title: 'Subscriptions and boosts',
          description:
            'Understand plans, active benefits, upgrades, renewals, and how visibility tools affect your store placement.',
        },
        {
          title: 'Reviews and trust',
          description:
            'See how ratings are displayed, how reviews support discovery, and what to do if you need moderation help.',
        },
      ]}
      sections={[
        {
          title: 'Most common help topics',
          bullets: [
            'I created a store but cannot see it publicly.',
            'My plan or subscription is not reflecting correctly.',
            'I want to edit store details, add products, or update services.',
            'I need help with login or account access.',
          ],
        },
        {
          title: 'Still blocked?',
          body:
            'If the help center does not solve the issue, contact the support team with your store name, registered email, and a brief description of the problem.',
        },
      ]}
      ctaTitle="Need a direct response?"
      ctaDescription="Share your issue with the support team and include enough context so it can be resolved faster."
      ctaHref="/contact"
      ctaLabel="Contact Support"
    />
  );
}
