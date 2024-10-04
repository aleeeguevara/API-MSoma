import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as msal from '@azure/msal-node';
import 'isomorphic-fetch';

@Injectable()
export class AuthService {
  private cca: msal.ConfidentialClientApplication;

  constructor() {
    this.cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET,
      },
    });
  }

  async getAccessToken(): Promise<string> {
    try {
      const response = await this.cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!response || !response.accessToken) {
        throw new HttpException('Falha ao obter o token de acesso', HttpStatus.UNAUTHORIZED);
      }

      return response.accessToken;
    } catch (err) {
      console.error('Erro ao obter o token de acesso:', err);
      throw new HttpException('Erro ao criar uma conexão com o Microsoft Graph', HttpStatus.UNAUTHORIZED);
    }
  }
}