import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as msal from '@azure/msal-node';
import 'isomorphic-fetch';

@Injectable()
export class AuthService {
  private cca: msal.ConfidentialClientApplication;

  constructor() {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TENANT_ID) {
      throw new HttpException('Variáveis de ambiente de autenticação não configuradas corretamente', HttpStatus.INTERNAL_SERVER_ERROR);
    }

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
      console.log('Tentando adquirir o token de acesso...');
      const response = await this.cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!response || !response.accessToken) {
        console.error('Token de acesso não foi retornado pela MSAL');
        throw new HttpException('Falha ao obter o token de acesso', HttpStatus.UNAUTHORIZED);
      }

      console.log('Token de acesso obtido com sucesso');
      return response.accessToken;
    } catch (err) {
      console.error('Erro ao obter o token de acesso:', err.message);
      if (err.response) {
        console.error('Detalhes da resposta de erro:', err.response.data || err.response);
      }
      throw new HttpException('Erro ao criar uma conexão com o Microsoft Graph', HttpStatus.UNAUTHORIZED);
    }
  }
}