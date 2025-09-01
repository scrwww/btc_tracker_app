import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
} from '@ionic/angular/standalone';

import {
  Chart,
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
  CategoryScale,
} from 'chart.js';
import 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import type { ChartConfiguration } from 'chart.js';
import type { FinancialDataPoint } from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';

@Component({
  selector: 'app-tracker',
  templateUrl: './tracker.page.html',
  styleUrls: ['./tracker.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonInput,
  ],
})
export class TrackerPage implements OnInit {
  saldo: number = 1000000;    // saldo em R$
  preco: number = 0;          // preço atual do BTC
  btc: number = 0;            // quantidade de BTC em carteira
  precoEntrada: number = 0;   // preço de entrada da posição
  estadoPosicao: boolean = false; // controla se há posição aberta
  inputValue: number = 0;     // valor digitado pelo usuário
  lucroAtual: number = 0;     // lucro/prejuízo atual da posição

  constructor() {}

  ngOnInit() {
    renderChart().then(() => {
      setInterval(updateChart, 3000);
      setInterval(() => this.updatePreco(), 3000); // mantém o preço atualizado
    });
  }

  async updatePreco() {
    const lastSellPrice: number = await getLastSellPrice();
    this.preco = lastSellPrice;

    // recalcula lucro/prejuízo se tiver posição aberta
    if (this.estadoPosicao && this.btc > 0) {
      const valorAtual = this.btc * this.preco;
      const valorEntrada = this.btc * this.precoEntrada;
      this.lucroAtual = valorAtual - valorEntrada;
    }
  }

  async getMax() {
    if (!this.preco) await this.updatePreco();
    const max = this.saldo / this.preco;
    console.log(max);
    this.inputValue = Number((Math.floor(max * 1e9) / 1e9).toFixed(9));
  }

  comprar() {
    if (!this.preco || this.inputValue <= 0) return;

    const custo = this.inputValue * this.preco;

    if (custo > this.saldo) {
      console.log("Saldo insuficiente!");
      return;
    }

    // debita saldo e adiciona BTC
    this.saldo -= custo;
    this.btc = this.inputValue;
    this.precoEntrada = this.preco;
    this.estadoPosicao = true;

    // atualizar botões
    const v = document.querySelector('#btn_vender');
    v?.removeAttribute('disabled');
    const c = document.querySelector('#btn_comprar');
    c?.setAttribute('disabled', 'true');

    console.log(`Comprou ${this.btc} BTC a R$${this.preco}`);
  }

  vender() {
    if (!this.preco || this.btc <= 0) return;

    const receita = this.btc * this.preco;

    // credita saldo e zera posição
    this.saldo += receita;
    this.btc = 0;
    this.precoEntrada = 0;
    this.estadoPosicao = false;
    this.lucroAtual = 0;

    // atualizar botões
    const c = document.querySelector('#btn_comprar');
    c?.removeAttribute('disabled');
    const v = document.querySelector('#btn_vender');
    v?.setAttribute('disabled', 'true');

    console.log(`Vendeu posição por R$${receita}. Novo saldo: R$${this.saldo}`);
  }
}

interface RawApiResponse {
  t: number[]; // timestamps
  o: string[]; // open
  h: string[]; // high
  l: string[]; // low
  c: string[]; // close
  v: string[]; // volume
}

Chart.register(
  TimeScale,
  LinearScale,
  CategoryScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
);
async function getLastSellPrice(): Promise<number> {
  return new Promise(async (resolve) => {
    const response = await fetch(
      `https://api.mercadobitcoin.net/api/v4/tickers?symbols=BTC-BRL`
    );
    const jsonData = await response.json();
    const price: number = await jsonData[0].last;
    resolve(price);
  });
}

function transformApiData(raw: RawApiResponse): FinancialDataPoint[] {
  return raw.t.map((timestamp, i) => ({
    x: timestamp * 1000, // this is so dumb... s to ms
    o: parseFloat(raw.o[i] ?? '0'),
    h: parseFloat(raw.h[i] ?? '0'),
    l: parseFloat(raw.l[i] ?? '0'),
    c: parseFloat(raw.c[i] ?? '0'),
  }));
}

async function fetchCandles(): Promise<FinancialDataPoint[]> {
  const timestamp = Date.now();
  const response = await fetch(
    `https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1m&to=${timestamp}&countback=120`
  );
  const raw: RawApiResponse = await response.json();
  return transformApiData(raw);
}

async function fetchLatestCandle(): Promise<FinancialDataPoint[]> {
  const timestamp = Date.now();
  const response = await fetch(
    `https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1m&to=${timestamp}&countback=1`
  );
  const raw: RawApiResponse = await response.json();
  return transformApiData(raw);
}

let chart: Chart<'candlestick'> | null = null;

async function renderChart() {
  const ctx = document.getElementById('candlestick') as HTMLCanvasElement;
  const candles = await fetchCandles();

  const config: ChartConfiguration<'candlestick'> = {
    type: 'candlestick',
    data: {
      datasets: [
        {
          label: 'Preço',
          data: candles,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute' },
        },
      },
    },
  };

  chart = new Chart(ctx, config) as any;
}

async function updateChart() {
  if (!chart) return;

  try {
    const latestCandles = await fetchLatestCandle();
    const latest = latestCandles[0];
    const dataset = chart.data.datasets[0];

    if (!latest || !dataset || !Array.isArray(dataset.data)) return;

    const data = dataset.data as FinancialDataPoint[];
    const last = data[data.length - 1];

    if (last && latest.x === last.x) {
      data[data.length - 1] = latest;
    } else if (last && latest.x > last.x) {
      data.push(latest);
      if (data.length > 100) data.shift();
    }

    chart.update('none');
    console.log(`Chart updat ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error :', error);
  }
}
