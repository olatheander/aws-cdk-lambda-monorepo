import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { MyType } from "@myola/types";

export const main = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  const t: MyType = {
    name: "Kalle",
    age: 42,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(t),
  };
};
