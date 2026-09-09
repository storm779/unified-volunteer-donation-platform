import { emailKey } from './auth.js';

export function buildSeed() {
  const createdAt = new Date().toISOString();
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
  const users = [
    {
      id: 'demo-user',
      name: 'Alex Morgan',
      email: 'alex@example.org',
      role: 'user',
      location: 'Pune, Maharashtra',
      bio: 'Small actions. Shared impact.',
    },
    {
      id: 'demo-organization',
      name: 'Ananya Rao',
      email: 'hello@brighterfutures.example',
      role: 'organization',
      organizationName: 'Brighter Futures Collective',
      location: 'Pune, Maharashtra',
      bio: 'A fictional sample organization creating opportunities for every community.',
    },
    {
      id: 'demo-organization-2',
      name: 'Rohan Mehta',
      email: 'hello@communitycare.example',
      role: 'organization',
      organizationName: 'Community Care Network',
      location: 'Mumbai, Maharashtra',
      bio: 'A fictional sample organization working alongside local communities.',
    },
    {
      id: 'demo-admin',
      name: 'Jordan Lee',
      email: 'admin@example.org',
      role: 'admin',
      location: 'Mumbai, Maharashtra',
    },
  ].map((user) => ({ ...user, disabled: false, createdAt }));
  const definitions = [
    [
      'education-every-child',
      'Education for Every Child',
      'Education',
      'Help curious minds go further with school supplies, learning spaces, and after-school support.',
      'Every child deserves the chance to discover what they are capable of. This sample campaign supports learning kits, library books, and community-led tutoring for children in underserved neighborhoods.\n\nContributions help our fictional Brighter Futures Collective coordinate school supplies with local teachers and create welcoming spaces to learn. Our team shares progress as contributions arrive. Together, we can turn small acts of generosity into lasting opportunities.',
      'Pune, Maharashtra',
      'education',
      500000,
      'demo-organization',
    ],
    [
      'rural-healthcare',
      'Rural Healthcare Initiative',
      'Healthcare',
      'Bring preventive care and essential health services closer to rural families.',
      'A healthy community begins with access to care. This sample initiative supports mobile health camps, basic screening supplies, and health education sessions in rural communities.\n\nOur fictional Community Care Network works with trained volunteers to help families navigate local services. Contributions support transport, equipment, and the everyday essentials that make community care possible.',
      'Nashik, Maharashtra',
      'healthcare',
      750000,
      'demo-organization-2',
    ],
    [
      'clean-water-project',
      'Clean Water Project',
      'Water',
      'Make reliable, clean drinking water part of everyday life for more families.',
      'Clean water gives families more time for school, work, and each other. This sample project helps communities maintain shared water points and learn practical water conservation habits.\n\nThe fictional Brighter Futures Collective coordinates local surveys, supplies, and volunteer support. Your contribution helps build a dependable foundation for a healthier community.',
      'Palghar, Maharashtra',
      'water',
      400000,
      'demo-organization',
    ],
    [
      'disaster-relief',
      'Disaster Relief Fund',
      'Emergency Relief',
      'Help communities respond to emergencies and rebuild with dignity.',
      'When an emergency affects a community, practical help matters. This sample fund supports essential household kits, temporary supplies, and locally coordinated recovery activities.\n\nThe fictional Community Care Network brings volunteers together to prepare supplies and support community-led response. Flexible contributions help the team respond where help is most useful.',
      'Raigad, Maharashtra',
      'relief',
      1000000,
      'demo-organization-2',
    ],
    [
      'feed-a-family',
      'Feed a Family',
      'Food Security',
      'Bring nourishing meals and grocery essentials to families who need a little support.',
      'A shared meal can be the beginning of a stronger community. This sample campaign supports grocery parcels and volunteer-led food distribution in collaboration with neighborhood groups.\n\nThe fictional Brighter Futures Collective focuses on practical support, thoughtful planning, and treating every family with dignity. Your contribution helps volunteers turn local generosity into everyday nourishment.',
      'Mumbai, Maharashtra',
      'food',
      300000,
      'demo-organization',
    ],
    [
      'green-city-plantation',
      'Green City Plantation Drive',
      'Environment',
      'Create greener neighborhoods through native tree planting and ongoing care.',
      'Greener streets make room for healthier, more connected communities. This sample campaign supports native saplings, planting supplies, and volunteer care sessions through the changing seasons.\n\nThe fictional Brighter Futures Collective helps neighborhood groups choose suitable sites and keep young trees healthy. Contributions support both planting day and the follow-up work that helps every sapling thrive.',
      'Bengaluru, Karnataka',
      'environment',
      200000,
      'demo-organization',
    ],
  ];
  const campaigns = definitions.map(
    ([id, title, category, summary, description, location, image, target, organizationId]) => ({
      id,
      title,
      category,
      summary,
      description,
      location,
      image: `/images/${image}.jpg`,
      target,
      raised: 0,
      donorCount: 0,
      organizationId,
      organizationName: users.find((user) => user.id === organizationId).organizationName,
      status: 'active',
      createdAt,
    }),
  );
  const seedDonations = [
    [125000, 98000, 47000],
    [170000, 150000, 62000],
    [145000, 100000, 39000],
    [180000, 65000, 36000],
    [72000, 45000, 19000],
    [56000, 30000, 18000],
  ];
  const donations = campaigns.flatMap((campaign, index) =>
    seedDonations[index].map((amount, position) => ({
      id: `sample-donation-${index}-${position}`,
      userId: position === 2 && index < 2 ? 'demo-user' : `sample-supporter-${position}`,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      organizationId: campaign.organizationId,
      donorName:
        position === 2 && index < 2
          ? 'Alex Morgan'
          : ['Community supporters', 'A kind neighbor', 'Priya Sharma'][position],
      amount,
      anonymous: position === 1,
      createdAt: day(-index - position - 1),
      paymentId: `sample-payment-${index}-${position}`,
      mode: 'sample',
    })),
  );
  for (const campaign of campaigns) {
    const rows = donations.filter((donation) => donation.campaignId === campaign.id);
    campaign.raised = rows.reduce((sum, donation) => sum + donation.amount, 0);
    campaign.donorCount = rows.length;
  }
  const opportunityDefinitions = [
    [
      'teaching-volunteer',
      'Teaching Volunteer',
      'Education',
      'Share your time, curiosity, and encouragement with young learners. Support reading circles, homework sessions, and creative activities alongside our community education team. A short volunteer orientation and learning materials are provided.',
      'Pune, Maharashtra',
      '2 hours / week',
      12,
      ['Teaching', 'Communication'],
      'demo-organization',
    ],
    [
      'medical-camp-assistant',
      'Medical Camp Assistant',
      'Healthcare',
      'Help a local team make a community health camp welcoming and organized. Volunteers assist with registration, directions, and supplies. This support role does not involve clinical work; medical tasks are handled only by qualified professionals.',
      'Nashik, Maharashtra',
      '1 day',
      8,
      ['Organization', 'Empathy'],
      'demo-organization-2',
    ],
    [
      'food-distribution',
      'Food Distribution Volunteer',
      'Food Security',
      'Spend a morning packing grocery essentials and coordinating community food distribution. Work with a friendly team to prepare parcels and keep pickup organized. An orientation and food handling guidance are provided before each session.',
      'Mumbai, Maharashtra',
      '3 hours / weekend',
      20,
      ['Teamwork', 'Logistics'],
      'demo-organization',
    ],
    [
      'environmental-cleanup',
      'Environmental Cleanup',
      'Environment',
      'Help care for a neighborhood green space with a community cleanup and native planting session. Join a team of neighbors, learn about local ecology, and make visible progress together. Gloves, bags, and basic supplies are provided.',
      'Bengaluru, Karnataka',
      'Half day',
      30,
      ['Teamwork', 'Outdoor activities'],
      'demo-organization',
    ],
    [
      'fundraising-coordinator',
      'Fundraising Coordinator',
      'Community',
      'Bring ideas and organization to a community fundraising effort. Help plan outreach, prepare clear updates, and coordinate a small volunteer team. This flexible opportunity welcomes people who enjoy writing, planning, and connecting with others.',
      'Remote',
      '3 hours / week',
      5,
      ['Communication', 'Planning'],
      'demo-organization-2',
    ],
  ];
  const opportunities = opportunityDefinitions.map(
    (
      [id, title, category, description, location, commitment, spots, skills, organizationId],
      index,
    ) => ({
      id,
      title,
      category,
      description,
      location,
      commitment,
      spots,
      skills,
      organizationId,
      organizationName: users.find((user) => user.id === organizationId).organizationName,
      date: day(10 + index * 4),
      status: 'open',
      createdAt,
    }),
  );
  const applications = [
    {
      id: 'sample-application-alex',
      userId: 'demo-user',
      userName: 'Alex Morgan',
      userEmail: 'alex@example.org',
      opportunityId: 'teaching-volunteer',
      opportunityTitle: 'Teaching Volunteer',
      organizationId: 'demo-organization',
      motivation:
        'I would love to help children build confidence through reading and creative activities.',
      status: 'accepted',
      createdAt: day(-2),
    },
  ];
  const credentials = users.map((user) => ({
    id: emailKey(user.email),
    userId: user.id,
    passwordHash: null,
  }));
  return { users, campaigns, opportunities, donations, applications, credentials };
}
