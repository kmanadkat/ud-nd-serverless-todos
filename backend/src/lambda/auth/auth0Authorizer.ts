import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'

import { verify, decode } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth')
const jwksUrl = 'https://dev-sk7qmkvk.us.auth0.com/.well-known/jwks.json'

export const handler = async (
  event: CustomAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken)
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}


/**
 * Description
 * @param {string} authHeader Header containing bearer token
 * @returns {Promise<JwtPayload>}
 */
async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader)
  const jwt: Jwt = decode(token, { complete: true }) as Jwt

  const cert = await getJwksCertificate(jwt.header.kid)  
  return verify(token, cert, {algorithms: ['RS256']}) as JwtPayload
}


/**
 * Description
 * @param {string} authHeader Header containing bearer token
 * @returns {string} token
 */
function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}


/**
 * Description
 * @param {string} kid JWT Token Header kid
 * @returns {Promise<string>} certificate
 */
async function getJwksCertificate(kid: string): Promise<string> {
  const response = await Axios.get(jwksUrl)

  if(response.status !== 200) {
    const errorMessage = `auth0Authorizer.ts/getJwksCertificate: ${response.statusText}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  const requiredKey = response.data.keys.find(key => key.kid === kid)
  if(!requiredKey) {
    const errorMessage = `auth0Authorizer.ts/getJwksCertificate: kid ${kid} is not found`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  return `-----BEGIN CERTIFICATE-----\n${requiredKey.x5c[0]}\n-----END CERTIFICATE-----\n`
}