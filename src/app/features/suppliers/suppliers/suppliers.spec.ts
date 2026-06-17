import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { Suppliers } from './suppliers';

describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Suppliers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
