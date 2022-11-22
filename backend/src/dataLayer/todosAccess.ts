import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { createLogger } from '../utils/logger'
import { TodoUpdate } from '../models/TodoUpdate'

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


  async createTodo(todo: TodoItem): Promise<TodoItem> {
    logger.info('Creating new Todo', {todoId: todo.todoId, userId: todo.userId})

    await this.docClient.put({
      TableName: this.todosTable,
      Item: todo
    }).promise()

    return todo
  }


  async updateTodo(todoId: string, userId: string, todoUpdate: TodoUpdate): Promise<boolean> {
    logger.info('Update Todo', { todoId, userId })
    try {
      await this.docClient.update({
        TableName: this.todosTable,
        Key: { todoId, userId },
        UpdateExpression: 'set #name = :newName, #dueDate = :newDueDate, #done = :newDone',
        ExpressionAttributeValues: {
          ':newName': todoUpdate.name,
          ':newDueDate': new Date(todoUpdate.dueDate).toDateString(),
          ':newDone': todoUpdate.done
        },
        ExpressionAttributeNames: {
          '#name': 'name',
          '#dueDate': 'dueDate',
          '#done': 'done'
        }
      }).promise()
  
      return true  
    } catch (error) {
      logger.error('Update Todo Error', { todoId, userId, message: error.message })
      return false
    }
  }
}