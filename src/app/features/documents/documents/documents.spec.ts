import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { Documents } from './documents';

describe('Documents', () => {
  let component: Documents;
  let fixture: ComponentFixture<Documents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Documents],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Documents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
