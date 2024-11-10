import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { format } from "date-fns-tz"; // Para manejar la zona horaria

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  try {
    // get param userId
    const userId = event.queryStringParameters.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Se requiere el parámetro 'userId' en la consulta.",
        }),
      };
    }

    const queryParams = {
      TableName: "UserTransactions",
      KeyConditionExpression: "UserId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // sort items of db
    };

    // Query to the UserTransactions table
    const result = await ddbDocClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      throw new Error("No se encontraron movimientos para el usuario especificado.");
    }

    // Get hour
    result.Items = result.Items.map(item => {
      const formattedDate = format(new Date(item.DateHour), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'America/Costa_Rica' });
      return { ...item, DateHour: formattedDate };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        transactions: result.Items,
      }),
    };
  } catch (error) {
    console.error("Error al procesar la solicitud:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al procesar la solicitud.",
        error: error.message,
      }),
    };
  }
};
