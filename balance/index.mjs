import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  try {
    // Get params userId and transactionAmount
    const userId = event.queryStringParameters.userId;
    const transactionAmount = parseFloat(event.queryStringParameters.transactionAmount);

    if (!userId || isNaN(transactionAmount)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Se requieren los parámetros 'userId' y 'transactionAmount' en la consulta.",
        }),
      };
    }

    const getParams = {
      TableName: "UserBalance",
      Key: { UserId: userId },
    };

    // get balance
    const result = await ddbDocClient.send(new GetCommand(getParams));

    if (!result.Item) {
      throw new Error("No se encontró el saldo para el usuario especificado.");
    }

    let currentBalance = result.Item.Balance;

    // Check if there is balance
    if (currentBalance < transactionAmount) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "El monto de la transacción excede el saldo disponible.",
          availableBalance: currentBalance,
          transactionAmount: transactionAmount,
        }),
      };
    }

    // calculate the new balance
    const newBalance = currentBalance - transactionAmount;

    // Params to update the balance
    const updateParams = {
      TableName: "UserBalance",
      Key: { UserId: userId },
      UpdateExpression: "set Balance = :balance",
      ExpressionAttributeValues: {
        ":balance": newBalance,
      },
      ReturnValues: "UPDATED_NEW",
    };

    // update the balance in db
    await ddbDocClient.send(new UpdateCommand(updateParams));

    // final balance
    return {
      statusCode: 200,
      body: JSON.stringify({
        balance: newBalance,
      }),
    };

  } catch (error) {
    console.error("Error al procesar la transacción:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al procesar la transacción.",
        error: error.message,
      }),
    };
  }
};
