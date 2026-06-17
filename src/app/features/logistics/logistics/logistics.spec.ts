import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { Logistics } from './logistics';

describe('Logistics', () => {
  let component: Logistics;
  let fixture: ComponentFixture<Logistics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logistics],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Logistics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
