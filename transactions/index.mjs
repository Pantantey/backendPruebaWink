import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { format } from "date-fns-tz";
import { subHours } from "date-fns"; 

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  try {
    // verify that data is received
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Falta el cuerpo de la solicitud." }),
      };
    }

    // Parse the request body
    const { TransactionId, Amount, ContactName, Detail } = JSON.parse(event.body);

    // verify that all parameters were sent
    if (!TransactionId || !Amount || !ContactName || !Detail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Faltan parámetros necesarios en la consulta." }),
      };
    }

    // verify TransactionId is a valid number
    const transactionId = Number(TransactionId);
    if (isNaN(transactionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El TransactionId debe ser un número." }),
      };
    }

    // verify Amount is a valid number
    const amount = Number(Amount);
    if (isNaN(amount)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El Amount debe ser un número." }),
      };
    }

    // get Date and hour and adjust to CST
    const date = new Date();
    const dateInCST = format(date, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'America/Costa_Rica' });

    // Subtract 18 hours to adjust time to CST
    const adjustedDate = subHours(new Date(dateInCST), 18);

    // format new hour and date
    const DateHour = format(adjustedDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'America/Costa_Rica' });

    // Create the transaction object with default values ​​for UserId and TransactionType
    const item = {
      UserId: "Andrey", // always 'Andrey'
      TransactionId: transactionId + 1, // transactionId is always incremented with each request because it must always be different
      Amount: amount,
      ContactName,
      DateHour, // new DateHour
      Detail,
      TransactionType: "SINPE móvil", // Always 'SINPE móvil'
    };

    const putParams = {
      TableName: "UserTransactions",
      Item: item,
    };

    // Add new item to the table
    await ddbDocClient.send(new PutCommand(putParams));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Transacción agregada exitosamente",
        transaction: item,
      }),
    };
  } catch (error) {
    console.error("Error al agregar la transacción:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error al procesar la solicitud.",
        error: error.message,
      }),
    };
  }
};
