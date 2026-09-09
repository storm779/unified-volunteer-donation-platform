import { createHash, randomUUID } from 'node:crypto';
import { assert } from '../utils/errors.js';
import { parse, schemas } from '../utils/validation.js';
import {
  assertOwner,
  emailKey,
  hashPassword,
  signDemoToken,
  verifyPassword,
} from '../services/auth.js';

const newest = (rows) => rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const publicDonation = ({ id, donorName, amount, anonymous, createdAt, mode }) => ({
  id,
  donorName: anonymous ? 'Anonymous supporter' : donorName,
  amount,
  anonymous,
  createdAt,
  mode,
});

export function createControllers({ store, config, payments }) {
  const demoOnly = () =>
    assert(config.mode === 'demo', 404, 'Use Firebase Authentication for this action.');
  const authResult = (user) => ({ token: signDemoToken(user, config), user });
  return {
    health: async (req, res) =>
      res.json({ status: 'ok', mode: config.mode, payments: config.paymentMode }),
    demo: async (req, res) => {
      demoOnly();
      const { role } = parse(schemas.demo, req.body);
      const user = await store.get('users', `demo-${role}`);
      assert(user && !user.disabled, 403, 'This demo account is disabled.');
      res.json(authResult(user));
    },
    register: async (req, res) => {
      demoOnly();
      const input = parse(schemas.register, req.body);
      assert(
        input.role !== 'organization' || input.organizationName,
        400,
        'An organization name is required.',
      );
      const passwordHash = await hashPassword(input.password);
      const user = {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        role: input.role,
        ...(input.organizationName ? { organizationName: input.organizationName } : {}),
        disabled: false,
        createdAt: new Date().toISOString(),
      };
      await store.transact(async (tx) => {
        const credentialId = emailKey(input.email);
        assert(
          !(await tx.get('credentials', credentialId)),
          409,
          'An account with this email already exists.',
        );
        await tx.set('credentials', credentialId, {
          id: credentialId,
          userId: user.id,
          passwordHash,
        });
        await tx.set('users', user.id, user);
      });
      res.status(201).json(authResult(user));
    },
    login: async (req, res) => {
      demoOnly();
      const input = parse(schemas.login, req.body);
      const credential = await store.get('credentials', emailKey(input.email));
      assert(
        credential && (await verifyPassword(input.password, credential.passwordHash)),
        401,
        'Email or password is incorrect.',
      );
      const user = await store.get('users', credential.userId);
      assert(user && !user.disabled, 403, 'This account has been disabled.');
      res.json(authResult(user));
    },
    sync: async (req, res) => {
      assert(config.mode === 'firebase', 400, 'Firebase profile sync is unavailable in demo mode.');
      const input = parse(schemas.sync, req.body);
      const uid = req.identity.uid;
      assert(req.identity.email, 400, 'An email address is required for registration.');
      const user = await store.transact(async (tx) => {
        const existing = await tx.get('users', uid);
        if (existing) return existing; // Role assignment happens once, never by re-syncing.
        const role = input.role || 'user';
        assert(
          role !== 'organization' || input.organizationName,
          400,
          'An organization name is required.',
        );
        const value = {
          id: uid,
          name: input.name || req.identity.name || req.identity.email.split('@')[0],
          email: req.identity.email,
          role,
          ...(input.organizationName ? { organizationName: input.organizationName } : {}),
          disabled: false,
          createdAt: new Date().toISOString(),
        };
        await tx.set('users', uid, value);
        return value;
      });
      res.json(user);
    },
    me: async (req, res) => res.json(req.user),
    profile: async (req, res) => {
      const input = parse(schemas.profile, req.body);
      assert(
        !input.organizationName || req.user.role === 'organization',
        403,
        'Only organizations have an organization name.',
      );
      const user = await store.transact(async (tx) => {
        const current = await tx.get('users', req.user.id);
        const next = { ...current, ...input };
        await tx.set('users', next.id, next);
        return next;
      });
      res.json(user);
    },
    listCampaigns: async (req, res) => res.json(newest(await store.list('campaigns'))),
    getCampaign: async (req, res) => {
      const campaign = await store.get('campaigns', parse(schemas.id, req.params.id));
      assert(campaign, 404, 'Campaign not found.');
      res.json(campaign);
    },
    campaignDonations: async (req, res) => {
      const campaignId = parse(schemas.id, req.params.id);
      assert(await store.get('campaigns', campaignId), 404, 'Campaign not found.');
      res.json(
        newest(await store.list('donations', [['campaignId', campaignId]])).map(publicDonation),
      );
    },
    createCampaign: async (req, res) => {
      const input = parse(schemas.campaign, req.body);
      const campaign = {
        ...input,
        id: randomUUID(),
        raised: 0,
        donorCount: 0,
        organizationId: req.user.id,
        organizationName: req.user.organizationName || req.user.name,
        createdAt: new Date().toISOString(),
      };
      await store.set('campaigns', campaign.id, campaign);
      res.status(201).json(campaign);
    },
    updateCampaign: async (req, res) => {
      const id = parse(schemas.id, req.params.id);
      const input = parse(schemas.campaignPatch, req.body);
      const campaign = await store.transact(async (tx) => {
        const current = await tx.get('campaigns', id);
        assert(current, 404, 'Campaign not found.');
        assertOwner(req.user, current);
        const next = { ...current, ...input };
        await tx.set('campaigns', id, next);
        return next;
      });
      res.json(campaign);
    },
    listOpportunities: async (req, res) => res.json(newest(await store.list('opportunities'))),
    getOpportunity: async (req, res) => {
      const opportunity = await store.get('opportunities', parse(schemas.id, req.params.id));
      assert(opportunity, 404, 'Volunteer opportunity not found.');
      res.json(opportunity);
    },
    createOpportunity: async (req, res) => {
      const input = parse(schemas.opportunity, req.body);
      const opportunity = {
        ...input,
        id: randomUUID(),
        organizationId: req.user.id,
        organizationName: req.user.organizationName || req.user.name,
        createdAt: new Date().toISOString(),
      };
      await store.set('opportunities', opportunity.id, opportunity);
      res.status(201).json(opportunity);
    },
    updateOpportunity: async (req, res) => {
      const id = parse(schemas.id, req.params.id);
      const input = parse(schemas.opportunityPatch, req.body);
      const opportunity = await store.transact(async (tx) => {
        const current = await tx.get('opportunities', id);
        assert(current, 404, 'Volunteer opportunity not found.');
        assertOwner(req.user, current);
        const next = { ...current, ...input };
        await tx.set('opportunities', id, next);
        return next;
      });
      res.json(opportunity);
    },
    apply: async (req, res) => {
      const input = parse(schemas.application, req.body);
      const id = `app_${createHash('sha256').update(`${req.user.id}:${input.opportunityId}`).digest('hex').slice(0, 40)}`;
      // Legacy/sample rows are also checked, so a sample applicant cannot apply twice.
      const previous = (await store.list('applications', [['userId', req.user.id]])).find(
        (row) => row.opportunityId === input.opportunityId,
      );
      const application = await store.transact(async (tx) => {
        const opportunity = await tx.get('opportunities', input.opportunityId);
        const existing = await tx.get('applications', previous?.id || id);
        assert(opportunity, 404, 'Volunteer opportunity not found.');
        assert(
          opportunity.status === 'open',
          409,
          'This opportunity is no longer accepting applications.',
        );
        assert(
          !existing || existing.status === 'withdrawn',
          409,
          'You have already applied to this opportunity.',
        );
        const value = {
          id: existing?.id || id,
          userId: req.user.id,
          userName: req.user.name,
          userEmail: req.user.email,
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          organizationId: opportunity.organizationId,
          motivation: input.motivation,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        await tx.set('applications', value.id, value);
        return value;
      });
      res.status(201).json(application);
    },
    updateApplication: async (req, res) => {
      const id = parse(schemas.id, req.params.id);
      const { status } = parse(schemas.applicationPatch, req.body);
      const application = await store.transact(async (tx) => {
        const current = await tx.get('applications', id);
        assert(current, 404, 'Application not found.');
        if (req.user.id === current.userId)
          assert(
            status === 'withdrawn',
            403,
            'Applicants can only withdraw their own applications.',
          );
        else {
          assertOwner(req.user, current);
          assert(status !== 'withdrawn', 403, 'Only the applicant can withdraw an application.');
        }
        const next = { ...current, status };
        await tx.set('applications', id, next);
        return next;
      });
      res.json(application);
    },
    dashboard: async (req, res) => {
      const role = req.query.view === 'personal' ? 'user' : req.user.role;
      const filters =
        role === 'admin'
          ? []
          : [[role === 'organization' ? 'organizationId' : 'userId', req.user.id]];
      const [donations, applications, campaigns, opportunities, users] = await Promise.all([
        store.list('donations', filters),
        store.list('applications', filters),
        role === 'admin'
          ? store.list('campaigns')
          : role === 'organization'
            ? store.list('campaigns', [['organizationId', req.user.id]])
            : [],
        role === 'admin'
          ? store.list('opportunities')
          : role === 'organization'
            ? store.list('opportunities', [['organizationId', req.user.id]])
            : [],
        role === 'admin' ? store.list('users') : [],
      ]);
      const stats = {
        totalDonated: donations.reduce((sum, row) => sum + row.amount, 0),
        supportedCampaigns: new Set(donations.map((row) => row.campaignId)).size,
        totalUsers: users.length,
        totalOrganizations: users.filter((user) => user.role === 'organization').length,
        totalDonations: donations.length,
        totalRaised: campaigns.reduce((sum, row) => sum + row.raised, 0),
        totalCampaigns: campaigns.length,
        totalOpportunities: opportunities.length,
      };
      const activity = newest([
        ...donations.map((row) => ({
          id: row.id,
          type: 'donation',
          title: `${row.donorName} supported ${row.campaignTitle}`,
          amount: row.amount,
          createdAt: row.createdAt,
        })),
        ...applications.map((row) => ({
          id: row.id,
          type: 'application',
          title: `${row.userName} applied for ${row.opportunityTitle}`,
          status: row.status,
          createdAt: row.createdAt,
        })),
      ]).slice(0, 15);
      res.json({
        donations: newest(donations),
        applications: newest(applications),
        campaigns: newest(campaigns),
        opportunities: newest(opportunities),
        users: newest(users),
        stats,
        activity,
      });
    },
    updateUser: async (req, res) => {
      const id = parse(schemas.id, req.params.id);
      const input = parse(schemas.adminUser, req.body);
      assert(
        id !== req.user.id,
        409,
        'Ask another administrator to change your role or account status.',
      );
      const user = await store.transact(async (tx) => {
        const current = await tx.get('users', id);
        assert(current, 404, 'Account not found.');
        const next = { ...current, ...input };
        if (next.role === 'organization' && !next.organizationName)
          next.organizationName = next.name;
        await tx.set('users', id, next);
        return next;
      });
      res.json(user);
    },
    order: async (req, res) =>
      res.status(201).json(await payments.createOrder(req.user, parse(schemas.order, req.body))),
    demoPayment: async (req, res) =>
      res.json(await payments.simulate(req.user, parse(schemas.demoPayment, req.body))),
    verifyPayment: async (req, res) =>
      res.json(await payments.verify(req.user, parse(schemas.verify, req.body))),
  };
}
