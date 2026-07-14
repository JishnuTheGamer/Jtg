#!/bin/bash
git pull
npm install
npm run build
pm2 restart all || npm run start || npm run dev
