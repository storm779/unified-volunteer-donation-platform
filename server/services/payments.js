import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { assert } from '../utils/errors.js';

export function createPaymentService({ store, config, gateway }) {
  const razorpay =
    gateway ||
    (config.paymentMode === 'razorpay-test'
      ? new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret })
      : null);

  async function createOrder(user, input) {
    const campaign = await store.get('campaigns', input.campaignId);
    assert(campaign, 404, 'Campaign not found.');
    assert(
      campaign.status === 'active',
      409,
      'This campaign is not currently accepting donations.',
    );
    const amount = input.amount * 100;
    const remoteOrder = razorpay
      ? await razorpay.orders.create({
          amount,
          currency: 'INR',
          receipt: `cg_${randomUUID().replaceAll('-', '')}`,
          notes: { campaignId: campaign.id, userId: user.id },
        })
      : { id: `demo_order_${randomUUID().replaceAll('-', '')}`, amount, currency: 'INR' };
    assert(
      remoteOrder.amount === amount && remoteOrder.currency === 'INR',
      502,
      'The payment provider returned an unexpected order.',
    );
    const order = {
      id: remoteOrder.id,
      userId: user.id,
      campaignId: campaign.id,
      amount,
      currency: 'INR',
      anonymous: input.anonymous,
      status: 'created',
      mode: config.paymentMode,
      createdAt: new Date().toISOString(),
    };
    await store.set('orders', order.id, order);
    return {
      id: order.id,
      amount,
      currency: order.currency,
      mode: config.paymentMode,
      ...(razorpay ? { keyId: config.razorpayKeyId } : {}),
    };
  }

  // This transaction owns all balance changes. A deterministic payment claim protects
  // against replay across orders; the completed order makes retries safe and idempotent.
  async function completeDonation(user, orderId, paymentId, mode) {
    const donationId = `don_${createHash('sha256').update(`${mode}:${paymentId}`).digest('hex').slice(0, 40)}`;
    return store.transact(async (tx) => {
      const order = await tx.get('orders', orderId);
      assert(order, 404, 'Payment order not found.');
      assert(order.userId === user.id, 403, 'This payment order belongs to another account.');
      assert(order.mode === mode, 400, 'Payment mode does not match this order.');
      if (order.status === 'completed') {
        assert(
          order.paymentId === paymentId,
          409,
          'This order has already been credited for a different payment.',
        );
        const existing = await tx.get('donations', order.donationId);
        assert(existing, 500, 'Payment record is incomplete. Contact the site administrator.');
        return existing;
      }
      const campaign = await tx.get('campaigns', order.campaignId);
      const claim = await tx.get('paymentClaims', donationId);
      const existing = await tx.get('donations', donationId);
      assert(campaign, 404, 'Campaign not found.');
      assert(!claim && !existing, 409, 'This payment has already been credited.');
      assert(
        Number.isInteger(order.amount) &&
          order.amount > 0 &&
          order.amount % 100 === 0 &&
          order.currency === 'INR',
        400,
        'Invalid stored payment order.',
      );
      const donation = {
        id: donationId,
        userId: user.id,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        organizationId: campaign.organizationId,
        donorName: order.anonymous ? 'Anonymous supporter' : user.name,
        amount: order.amount / 100,
        anonymous: order.anonymous,
        createdAt: new Date().toISOString(),
        paymentId,
        mode,
      };
      await tx.set('donations', donation.id, donation);
      await tx.set('paymentClaims', donationId, { id: donationId, orderId, paymentId });
      await tx.set('campaigns', campaign.id, {
        ...campaign,
        raised: campaign.raised + donation.amount,
        donorCount: campaign.donorCount + 1,
      });
      await tx.set('orders', order.id, {
        ...order,
        status: 'completed',
        paymentId,
        donationId: donation.id,
        completedAt: donation.createdAt,
      });
      return donation;
    });
  }

  async function verify(user, input) {
    assert(
      config.paymentMode === 'razorpay-test',
      400,
      'Razorpay verification is unavailable in simulated payment mode.',
    );
    const order = await store.get('orders', input.razorpay_order_id);
    assert(order, 404, 'Payment order not found.');
    assert(order.userId === user.id, 403, 'This payment order belongs to another account.');
    assert(order.mode === 'razorpay-test', 400, 'This is not a Razorpay order.');
    const expected = createHmac('sha256', config.razorpayKeySecret)
      .update(`${order.id}|${input.razorpay_payment_id}`)
      .digest();
    const supplied = Buffer.from(input.razorpay_signature, 'hex');
    assert(
      supplied.length === expected.length && timingSafeEqual(supplied, expected),
      400,
      'Payment signature verification failed.',
    );
    let payment;
    try {
      payment = await razorpay.payments.fetch(input.razorpay_payment_id);
    } catch {
      assert(false, 502, 'Unable to confirm payment with Razorpay. Retry verification shortly.');
    }
    assert(
      payment.id === input.razorpay_payment_id && payment.order_id === order.id,
      400,
      'Payment does not match the stored order.',
    );
    assert(
      payment.amount === order.amount && payment.currency === order.currency,
      400,
      'Payment amount or currency does not match the stored order.',
    );
    assert(
      payment.status === 'captured' && payment.captured === true,
      409,
      'Payment is not captured yet. Enable automatic capture in Razorpay test settings and retry verification.',
    );
    return completeDonation(user, order.id, payment.id, 'razorpay-test');
  }
  async function simulate(user, { orderId }) {
    assert(
      config.paymentMode === 'demo',
      404,
      'Simulated payments are not enabled on this server.',
    );
    return completeDonation(user, orderId, `simulated_${orderId}`, 'demo');
  }
  return { createOrder, verify, simulate };
}
