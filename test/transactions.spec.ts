import { execSync } from 'node:child_process'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'
import request from 'supertest'

import { app } from '../src/app'

describe('Transaction routes', async () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 500,
        type: 'credit',
      })
      .expect(201)
  })

  it('should be able to list all transcactions from a session', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 500,
        type: 'credit',
      })
      .expect(201)

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies ?? [])
      .expect(200)

    expect(listTransactionsResponse.body).toHaveProperty('transactions')
    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 500,
      }),
    ])
  })

  it(`should be able to get a specific transcaction by it's id`, async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 500,
        type: 'credit',
      })
      .expect(201)

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies ?? [])
      .expect(200)

    const transactionId = listTransactionsResponse.body.transactions[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies ?? [])
      .expect(200)

    expect(getTransactionResponse.body).toHaveProperty('transaction')
    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 500,
      })
    )
  })

  it('should be able to get the summary from transactions of a session', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 500,
        type: 'credit',
      })
      .expect(201)

    const cookies = createTransactionResponse.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies ?? [])
      .send({
        title: 'Debit transaction',
        amount: 250,
        type: 'debit',
      })
      .expect(201)

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies ?? [])
      .expect(200)

    expect(summaryResponse.body).toHaveProperty('summary')
    expect(summaryResponse.body.summary).toEqual({
      amount: 250,
    })
  })
})
