import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import * as zkSnark from "snarkjs"; // @ts-ignore
import { stringifyBigInts, unstringifyBigInts } from "snarkjs/src/stringifybigint.js"; // @ts-ignore

import { FileImportService } from './../crypto/file.import.service';
import { AppService } from './app.service';

import { User } from './signup.interface';

import { AppHelperService } from './helpers/app.helper.service';
import { DataService } from './data.service';
import { DomSanitizer } from '@angular/platform-browser';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {

  title = 'disclose';
  fileToUpload: File;
  user: FormGroup;
  loader = false;
  secret: string;
  inputs: any;
  formData: FormData;
  proofStr: any;
  publicSignalsStr: string;
  userData: User;
  success = false;
  valueNow = 0;
  uri: any;

  connection: any;

  @ViewChild('fileInputLabel')
  fileInputLabel: ElementRef;

  constructor (
    private fb: FormBuilder,
    private appService: AppService,
    private appHelperService: AppHelperService,
    private fileImportService: FileImportService,    
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.configureForm();
  }

  ngOnDestroy() {
   this.connection.unsubscribe();
  }

  configureForm () {
    this.user = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      address: [''],
      postcode: [''],
      city: [''],
      country: [''],
      age: [''],
      email: ['', [Validators.required, Validators.email, Validators.minLength(3)]],
      fileToUpload: ['']
    });
  }

  async onSubmit({ value }: { value: User }) {
    this.loader = true;

    try {
      this.setUserData(value);
      this.setFormData();
      this.setZkProofInputs();
      const circuitAndProvingKeyArr = await this.retrieveCircuitAndProvingKey();
      await this.createProof(circuitAndProvingKeyArr);
      this.uploadInfomations()
      .then((signedData) => {

        let keyStore: any = {};
        keyStore.signedData = signedData;
        keyStore.secret = stringifyBigInts(this.secret);
        keyStore.inputs = stringifyBigInts(this.inputs);

        this.uri = this.sanitizer.bypassSecurityTrustUrl("data:application/json;charset=UTF-8," + encodeURIComponent(JSON.stringify(keyStore)));

        this.success = true;
        setTimeout(()=> this.success = false, 4000);

      })
      .catch(err => console.log(err));
    } catch (err) {
      console.log(err);
    }
    this.loader = false;
  }

  setUserData(data: User) {
    this.userData = {
      'id': '',
      'firstName': data.firstName,
      'lastName': data.lastName,
      'city': data.city,
      'country': data.country,
      'postcode': data.postcode,
      'address': data.address,
      'age': data.age,
      'email': data.email,
      'idProof': this.fileToUpload
    }
  }

  setFormData () {
    this.formData = new FormData();
    this.formData.append('firstName', this.userData.firstName);
    this.formData.append('lastName', this.userData.lastName);
    this.formData.append('city', this.userData.city);
    this.formData.append('country', this.userData.country);
    this.formData.append('age', (this.userData.age).toString(10));
    this.formData.append('email', this.userData.email);
    this.formData.append('idProof', this.fileToUpload);
  }

  setZkProofInputs() {
    this.secret = this.appHelperService.random(6);
    this.inputs = [];
    // @ts-ignore
    for(var pair of this.formData.entries()) {
      if (pair[0] !== "idProof") {
        let shortHexFormValue = this.appHelperService.str2Hex(pair[1]).slice(-16);
        let intShortHexFormValue= parseInt(shortHexFormValue, 16);
        let bigIntFormValueRepresentation = zkSnark.bigInt(intShortHexFormValue);
        this.inputs.push(bigIntFormValueRepresentation);
      }
    }
  }

  retrieveCircuitAndProvingKey() {
    return new Promise((resolve, reject) => this.fileImportService.getZkCircuitAndProvingKey().subscribe(resolve, reject));
  }

  createProof(circuitAndProvingKeyArr) {
    return new Promise((resolve, reject) => {
      try {
        const provingKey = unstringifyBigInts(circuitAndProvingKeyArr[1]);
        const circuit = new zkSnark.Circuit(circuitAndProvingKeyArr[0]);
        const witness = circuit.calculateWitness({ 'in': this.inputs, 'priv': this.secret });
        console.log(this.inputs, this.secret);
        console.log(new Date(), 'Generating proof');
        const {publicSignals, proof } = zkSnark.groth.genProof(provingKey, witness);
        console.log(new Date(), 'Done.');
        this.proofStr = JSON.stringify(stringifyBigInts(proof));
        this.publicSignalsStr = JSON.stringify(stringifyBigInts(publicSignals));
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  uploadInfomations() {
    this.formData.append('proofStr', this.proofStr);
    this.formData.append('publicSignalsStr', this.publicSignalsStr);
    return this.appService.uploadUserInformationsToAuthority(this.formData).toPromise();
  }

  onFileChange(files: FileList) {
    this.fileInputLabel.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.fileToUpload = files.item(0);
  }

}
