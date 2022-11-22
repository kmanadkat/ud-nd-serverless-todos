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
    private readonly indexName = process.env.TODOS_CREATED_AT_INDEX,
    private readonly s3Client = new XAWS.S3({ signatureVersion: 'v4' }),
    private readonly bucketName = process.env.ATTACHMENT_S3_BUCKET,
    private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION) {
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

  async deleteTodo(todoId: string, userId: string): Promise<boolean> {
    logger.info('Delete Todo', { todoId, userId })
    try {
      // Delete Todo From DynamoDB
      await this.docClient.delete({
        TableName: this.todosTable,
        Key: { todoId, userId }
      }).promise()

      // Delete Todo Attachment If Any
      this.s3Client.deleteObject({
        Bucket: this.bucketName,
        Key: todoId
      }, (err, _data) => {
        if(err) logger.info('Attachment Delete For Todo', {err})

        logger.info('Attachment Successfully deleted', { todoId })
      })

      return true
    } catch (error) {
      logger.error('Delete Todo Error', { todoId, userId, message: error.message })
      return false
    }
  }

  async generateUploadUrl(todoId: string, userId: string): Promise<string> {
    logger.info('Generate Upload URL For Todo Attachment', { todoId })
    const newAttachmentURL = `https://${this.bucketName}.s3.amazonaws.com/${todoId}`
    try {
      await this.docClient.update({
        TableName: this.todosTable,
        Key: { todoId, userId },
        UpdateExpression: 'set #attachmentUrl = :newURL',
        ExpressionAttributeValues: { ':newURL': newAttachmentURL },
        ExpressionAttributeNames: { '#attachmentUrl': 'attachmentUrl'}
      }).promise()

      return this.s3Client.getSignedUrl('putObject', {
        Bucket: this.bucketName,
        Key: todoId,
        Expires: parseInt(this.urlExpiration),
      });
    } catch (error) {
      logger.error('Generate Upload URL For Todo Attachment Error', { todoId, message: error.message })
      return ''
    }
  }
}