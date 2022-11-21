import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { createLogger } from '../utils/logger'

const logger = createLogger('todos')
const XAWS = AWSXRay.captureAWS(AWS)

export class TodoAccess {
  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly indexName = process.env.TODOS_CREATED_AT_INDEX) {
  }

  async getAllTodos(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todos for user', { userId })

    const result = await this.docClient.query({
      TableName: this.todosTable,
      IndexName: this.indexName,
      KeyConditionExpression: 'userId= :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false
    }).promise()

    const items = result.Items as TodoItem[]
    return items
  }
}